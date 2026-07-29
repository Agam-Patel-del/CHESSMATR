import { io } from "socket.io-client";

export const socket = io(import.meta.env.VITE_API_BASE_URL || "", {
  autoConnect: false,
  withCredentials: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000
});

socket.on("connect", () => {
  console.log(`[Socket] connected: ${socket.id}`);
});

socket.on("disconnect", (reason) => {
  console.log(`[Socket] disconnected: ${socket.id} for reason ${reason}`);
});

socket.on("connect_error", (error) => {
  console.log(`[Socket] Connection error: ${error}`);

});