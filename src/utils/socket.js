import { io } from "socket.io-client";

let socket;

export const initSocket = () => {
  if (!socket) {
    // Replace with your Vercel deployment URL
    socket = io("https://skribbl-io.vercel.app", {
      path: "/api/socket",
    });
  }
  return socket;
};
