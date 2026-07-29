import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import { registerSocketHandlers } from "./socket/index.js";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import friendRoutes from "./routes/friendRoutes.js";
import dns from "node:dns/promises";

dns.setServers(["1.1.1.1", "8.8.8.8"]);

dotenv.config();
const PORT = process.env.PORT || 5000;
const frontendURL = process.env.FRONTEND_URL || "http://localhost:3000";
const app = express();

app.set("trust proxy", 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  cors({
    origin: frontendURL,
    credentials: true,
  })
);

app.get("/", (req, res) => {
  res.status(200).json({ success: true, message: "Backend server is running" });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true, message: "Server is healthy" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/friends", friendRoutes);

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: frontendURL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

registerSocketHandlers(io);

(async () => {
  try {
    await connectDB();

    httpServer.listen(PORT, () => {
      console.log(`SERVER IS RUNNING ON ${PORT}`);
    });
  }
  catch (error) {
    console.error(`Failed to start server: ${error}`);
    process.exit(1);
  }
})();

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Requested Route not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});