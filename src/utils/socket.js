import { io } from "socket.io-client";

const SERVER_URL = "https://82839154-2e2c-4504-b192-b6f524f136c9-00-v9foiltu12xi.picard.replit.dev";

export const socket = io(SERVER_URL, {
  transports: ["websocket"], // Force WebSocket for reliability
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});
