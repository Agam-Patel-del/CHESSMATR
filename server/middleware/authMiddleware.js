import jwt from "jsonwebtoken";
import { User } from "../models/index.js";

export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.userId).select("tokenVersion").lean();

    if (payload.tokenVersion !== user.tokenVersion) {
      return next(new Error("Session expired or revoked"));
    }

    req.user = { id: payload.userId, username: payload.username };
    next();
  } catch (err) {
    console.error(`[Auth Middleware] Verification failed: ${err.message}`);
    return res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
};