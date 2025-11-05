import { io } from "socket.io-client";

// replace with your deployed server URL if not localhost
const SERVER_URL = "https://skribbl-io-orcin.vercel.app"; 

export const initSocket = () => io(SERVER_URL);
