import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { User, toPublicProfile } from "../models/index.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { sendVerificationEmail, sendResetPasswordEmail } from "../services/emailService.js";
import { authLimiter, emailLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function generateToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      username: user.username,
      tokenVersion: user.tokenVersion
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

router.post("/register", emailLimiter, async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }
    if (username.length < 3 || username.length > 20 || !(/^[a-zA-Z0-9_]+$/.test(username))) {
      return res.status(400).json({ error: "username must be 3 to 20 characters (letters, numbers, underscores only)" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(409).json({ error: "Email is already registered" });
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(409).json({ error: "Username is already taken" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const otp = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
    const OTPExpires = new Date(Date.now() + 15 * 60 * 1000);

    const user = await User.create({
      username,
      email: email.toLowerCase(),
      passwordHash,
      isVerified: false,
      OTP: hashedOtp,
      OTPExpires,
    });

    await sendVerificationEmail(user.email, user.username, otp);

    res.status(201).json({
      message: "Registration successful. Verification email sent.",
      email: user.email,
      isVerified: false,
    });
  } catch (err) {
    console.error(`[Auth] Register error: ${err}`);
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

router.post("/login", authLimiter, async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: "Username/email and password are required" });
    }

    let user = null;
    if (identifier.includes("@")) {
      user = await User.findOne({ email: identifier.toLowerCase() });
    } else {
      user = await User.findOne({ username: identifier });
    }

    if (!user) {
      return res.status(401).json({ error: "Invalid Username or email" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        error: "Please verify your email address to log in",
        email: user.email,
        isVerified: false,
      });
    }

    const token = generateToken(user);
    res.cookie("token", token, COOKIE_OPTIONS);
    res.json({ user: toPublicProfile(user) });
  } catch (err) {
    console.error(`[Auth] Login error: ${err}`);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("token", COOKIE_OPTIONS);
  res.json({ success: true });
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("username stats isVerified tokenVersion createdAt")
      .lean();
    if (!user || !user.isVerified) {
      res.clearCookie("token", COOKIE_OPTIONS);
      return res.status(401).json({ error: "Not authenticated or session expired" });
    }

    res.json({ user: toPublicProfile(user) });
  } catch (err) {
    res.status(401).json({ error: "Session expired" });
  }
});

router.post("/verify-email", authLimiter, async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: "Email and verification code are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("email username isVerified OTP OTPExpires verificationAttempts tokenVersion");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: "Email is already verified" });
    }

    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    if (user.OTP !== hashedOtp || user.OTPExpires < new Date()) {
      user.verificationAttempts = (user.verificationAttempts || 0) + 1;

      if (user.verificationAttempts >= 5) {
        user.OTP = undefined;
        user.OTPExpires = undefined;
        user.verificationAttempts = 0;
        await user.save();
        return res.status(400).json({
          error: "Too many failed verification attempts. Please request a new code.",
        });
      }

      await user.save();
      return res.status(400).json({ error: "Invalid or expired verification code" });
    }

    user.isVerified = true;
    user.OTP = undefined;
    user.OTPExpires = undefined;
    user.verificationAttempts = 0;
    await user.save();

    const token = generateToken(user);
    res.cookie("token", token, COOKIE_OPTIONS);
    res.json({ success: true, user: toPublicProfile(user) });
  } catch (err) {
    console.error(`[Auth] Verify email error: ${err}`);
    res.status(500).json({ error: "Verification failed. Please try again." });
  }
});

router.post("/resend-verification", emailLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("email username isVerified");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: "Email is already verified" });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
    user.OTP = hashedOtp;
    user.OTPExpires = new Date(Date.now() + 15 * 60 * 1000);
    user.verificationAttempts = 0;
    await user.save();

    await sendVerificationEmail(user.email, user.username, otp);

    res.json({ success: true, message: "Verification code resent successfully" });
  } catch (err) {
    console.error(`Auth] Resend verification error: ${err}`);
    res.status(500).json({ error: "Resend failed. Please try again." });
  }
});
router.post("/forgot-password", emailLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("_id email username");
    const successResponse = {
      success: true,
      message: "a reset link has been sent to the registered email",
    };

    if (!user) {
      return res.json(successResponse);
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;
    await sendResetPasswordEmail(user.email, user.username, resetUrl);

    res.json(successResponse);
  } catch (err) {
    console.error(`[Auth] Forgot password error for email ${email} , error : ${err}`);
    res.status(500).json({ error: "Request failed. Please try again." });
  }
});

router.post("/reset-password", authLimiter, async (req, res) => {
  try {
    const { token, email, password } = req.body;

    if (!token || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    }).select("_id passwordHash tokenVersion");

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired password reset link" });
    }

    const isSamePassword = await bcrypt.compare(password, user.passwordHash);
    if (isSamePassword) {
      return res.status(400).json({ error: "New password must be different from previous one" });
    }

    user.passwordHash = await bcrypt.hash(password, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    res.json({ success: true, message: "Password has been reset successfully. You can now log in." });
  } catch (err) {
    console.error(`[Auth] Reset password error: ${err}`);
    res.status(500).json({ error: "Reset failed. Please try again." });
  }
});

export default router;