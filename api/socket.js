import { Server } from "socket.io";

let io;

const rooms = {}; // { roomId: { players: [], drawerIndex: 0, word: "" } }
const words = ["apple", "house", "tree", "cat", "dog", "car", "boat"]; // Simple word list

export default function handler(req, res) {
  if (!res.socket.server.io) {
    io = new Server(res.socket.server, {
      path: "/api/socket",
      cors: {
        origin: "*",
      },
    });

    res.socket.server.io = io;

    io.on("connection", (socket) => {
      console.log("New client connected:", socket.id);

      socket.on("joinRoom", ({ roomId, username }) => {
        socket.join(roomId);

        if (!rooms[roomId]) {
          rooms[roomId] = { players: [], drawerIndex: 0, word: "" };
        }

        rooms[roomId].players.push(username);

        io.to(roomId).emit("updatePlayers", rooms[roomId].players);
      });

      socket.on("startGame", () => {
        const roomId = Array.from(socket.rooms)[1]; // [0] is socket.id
        const room = rooms[roomId];
        if (!room) return;

        room.drawerIndex = 0;
        room.word = words[Math.floor(Math.random() * words.length)];
        io.to(roomId).emit("gameStarted");
        io.to(roomId).emit("setDrawer", room.players[room.drawerIndex]);
        io.to(roomId).emit("newWord", room.word);
      });

      socket.on("draw", (data) => {
        const roomId = Array.from(socket.rooms)[1];
        socket.to(roomId).emit("draw", data);
      });

      socket.on("clearCanvas", () => {
        const roomId = Array.from(socket.rooms)[1];
        io.to(roomId).emit("clearCanvas");
      });

      socket.on("chatMessage", ({ username, text }) => {
        const roomId = Array.from(socket.rooms)[1];
        const room = rooms[roomId];
        if (!room) return;

        if (text.toLowerCase() === room.word.toLowerCase()) {
          io.to(roomId).emit(
            "correctGuess",
            `${username} guessed the word correctly!`
          );
          // Move to next round
          room.drawerIndex =
            (room.drawerIndex + 1) % room.players.length;
          room.word = words[Math.floor(Math.random() * words.length)];
          io.to(roomId).emit("setDrawer", room.players[room.drawerIndex]);
          io.to(roomId).emit("newWord", room.word);
        } else {
          io.to(roomId).emit("chatMessage", { username, text });
        }
      });

      socket.on("disconnecting", () => {
        const roomId = Array.from(socket.rooms)[1];
        if (!roomId || !rooms[roomId]) return;

        rooms[roomId].players = rooms[roomId].players.filter(
          (name) => name !== socket.id
        );
        io.to(roomId).emit("updatePlayers", rooms[roomId].players);
      });
    });
  }

  res.end();
}
