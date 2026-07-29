import nodemailer from "nodemailer";

let transporter = null;

function getTransporter() {
  if (transporter !== null) {
    return transporter;
  }

  const isSmtpConfigured = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
  if (isSmtpConfigured) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

export async function sendVerificationEmail(email, username, otp) {
  const subject = "Verify your ChessMatr Account";
  const textContent = `Hi ${username},\n\nYour 6-digit verification code is: ${otp}\n\nThis code will expire in 15 minutes.`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ebe5db; border-radius: 4px; background-color: #fff;">
      <h2 style="color: #5c4033; font-family: "Lora", serif; border-bottom: 2px solid #5c4033; padding-bottom: 10px;">Verify your ChessMatr Account</h2>
      <p style="font-size: 1rem; color: #2d2422;">Hi <strong>${username}</strong>,</p>
      <p style="font-size: 1rem; color: #2d2422;">Thank you for registering at ChessMatr! Please use the following 6-digit verification code to complete your signup:</p>
      <div style="text-align: center; margin: 30px 0;">
        <span style="font-size: 2.25rem; font-weight: bold; letter-spacing: 5px; color: #5c4033; background-color: #fdfbf7; padding: 15px 30px; border: 1px dashed #c4b9aa; border-radius: 4px; display: inline-block;">${otp}</span>
      </div>
      <p style="font-size: 0.9rem; color: #5c504d;">This code is valid for 15 minutes. If you did not request this code, please ignore this email.</p>
    </div>
  `;

  const client = getTransporter();

  if (client) {
    try {
      await client.sendMail({
        from: `"${process.env.SMTP_FROM_NAME || "ChessMatr"}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
        to: email,
        subject,
        text: textContent,
        html: htmlContent,
      });
      console.log(`[Email] Verification OTP sent successfully to ${email}`);
    } catch (error) {
      console.error(`[Email] Failed to send verification OTP to ${email}:`, error);
      throw error;
    }
  } else {
    console.log("\n" + "=".repeat(60));
    console.log(`[DEVELOPMENT MAIL FALLBACK]`);
    console.log(`TO: ${email}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`CODE: ${otp}`);
    console.log(`TEXT: ${textContent}`);
    console.log("=".repeat(60) + "\n");
  }
}

export async function sendResetPasswordEmail(email, username, resetUrl) {
  const subject = "Reset your ChessMatr Password";
  const textContent = `Hi ${username},\n\nYou requested a password reset. Please use the following link to choose a new password:\n\n${resetUrl}\n\nThis link is valid for 1 hour.`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ebe5db; border-radius: 4px; background-color: #fff;">
      <h2 style="color: #5c4033; font-family: "Lora", serif; border-bottom: 2px solid #5c4033; padding-bottom: 10px;">Reset your ChessMatr Password</h2>
      <p style="font-size: 1rem; color: #2d2422;">Hi <strong>${username}</strong>,</p>
      <p style="font-size: 1rem; color: #2d2422;">We received a request to reset your password. Click the button below to choose a new password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #5c4033; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Reset Password</a>
      </div>
      <p style="font-size: 0.9rem; color: #5c504d;">If the button above does not work, copy and paste this URL into your browser:</p>
      <p style="font-size: 0.85rem; color: #5c4033; word-break: break-all;"><a href="${resetUrl}">${resetUrl}</a></p>
      <p style="font-size: 0.9rem; color: #5c504d; margin-top: 20px;">This link is valid for 1 hour. If you did not request a password reset, you can safely ignore this email.</p>
    </div>
  `;

  const client = getTransporter();

  if (client) {
    try {
      await client.sendMail({
        from: `"${process.env.SMTP_FROM_NAME || "ChessMatr"}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
        to: email,
        subject,
        text: textContent,
        html: htmlContent,
      });
      console.log(`[Email] Password reset link sent successfully to ${email}`);
    } catch (error) {
      console.error(`[Email] Failed to send password reset link to ${email}:`, error);
      throw error;
    }
  } else {
    console.log("\n" + "=".repeat(60));
    console.log(`[DEVELOPMENT MAIL FALLBACK]`);
    console.log(`TO: ${email}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`LINK: ${resetUrl}`);
    console.log(`TEXT: ${textContent}`);
    console.log("=".repeat(60) + "\n");
  }
}
