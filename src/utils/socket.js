// ✅ src/utils/socket.js
import { io } from "socket.io-client";

// Replace this with your actual Replit or server URL
const SERVER_URL = "https://82839154-2e2c-4504-b192-b6f524f136c9-00-v9foiltu12xi.picard.replit.dev:3000";

export const initSocket = () => {
  const socket = io(SERVER_URL, {
    transports: ["websocket"], // ensures faster and more stable connections
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on("connect", () => {
    console.log("✅ Connected to game server:", SERVER_URL);
  });

  socket.on("disconnect", () => {
    console.log("❌ Disconnected from server.");
  });

  socket.on("connect_error", (err) => {
    console.error("⚠️ Connection error:", err.message);
  });

  return socket;
};
