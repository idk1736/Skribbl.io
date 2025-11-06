import { io } from 'socket.io-client';

export const socket = io('https://82839154-2e2c-4504-b192-b6f524f136c9-00-v9foiltu12xi.picard.replit.dev'); 

export const initSocket = () => io(SERVER_URL);
