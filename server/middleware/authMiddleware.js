import jwt from "jsonwebtoken";

export const authMiddleware = (req, res, next) => {
  try {
    let token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.userId, username: payload.username };
    next();
  } catch (err) {
    console.error(`[Auth Middleware] Verification failed: ${err.message}`);
    return res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
};