import jwt from "jsonwebtoken";
import { User } from "../models/index.js";

export async function socketAuthMiddleware(socket, next) {
  const cookieHeader = socket.handshake.headers.cookie || "";
  const tokenMatch = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
  const token = tokenMatch ? tokenMatch[1] : null;

  if (!token) {
    return next(new Error("Not authenticated"));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(payload.userId).select("tokenVersion").lean();
    if (!user || payload.tokenVersion !== user.tokenVersion) {
      return next(new Error("Session expired or revoked"));
    }

    socket.data.userId = payload.userId;
    socket.data.username = payload.username;
    next();
  } catch {
    next(new Error("Session expired"));
  }
}