import { createServer } from "http";
import express from "express";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: "*" },
});

const rooms = {}; // { roomId: { players: [{id, name}], drawerIndex, word } }

const words = [
  "apple", "banana", "car", "dog", "house", "tree", "computer", "rocket",
  "sun", "moon", "star", "flower", "cat", "elephant", "guitar", "book",
];

function pickWord() {
  return words[Math.floor(Math.random() * words.length)];
}

io.on("connection", (socket) => {
  console.log("New connection:", socket.id);

  socket.on("joinRoom", ({ roomId, username }) => {
    if (!rooms[roomId]) {
      rooms[roomId] = { players: [], drawerIndex: 0, word: "" };
    }

    rooms[roomId].players.push({ id: socket.id, name: username });
    socket.join(roomId);

    // Notify everyone in room
    const playerNames = rooms[roomId].players.map((p) => p.name);
    io.to(roomId).emit("updatePlayers", playerNames);

    // If first player, set drawer
    if (rooms[roomId].players.length === 1) {
      rooms[roomId].word = pickWord();
      io.to(socket.id).emit("setDrawer", username);
      io.to(socket.id).emit("newWord", rooms[roomId].word);
      io.to(roomId).emit(
        "chatMessage",
        { system: true, text: `${username} is the drawer!` }
      );
    }
  });

  socket.on("startGame", () => {
    // rotate drawer
    const roomId = Object.keys(socket.rooms).find((r) => r !== socket.id);
    if (!roomId) return;

    const room = rooms[roomId];
    if (!room || room.players.length < 2) return;

    room.drawerIndex = (room.drawerIndex + 1) % room.players.length;
    room.word = pickWord();
    const drawer = room.players[room.drawerIndex];

    io.to(roomId).emit("gameStarted");
    io.to(drawer.id).emit("setDrawer", drawer.name);
    io.to(drawer.id).emit("newWord", room.word);
    io.to(roomId).emit(
      "chatMessage",
      { system: true, text: `${drawer.name} is the drawer!` }
    );
  });

  socket.on("draw", (data) => {
    const roomId = Object.keys(socket.rooms).find((r) => r !== socket.id);
    if (!roomId) return;
    socket.to(roomId).emit("draw", data);
  });

  socket.on("clearCanvas", () => {
    const roomId = Object.keys(socket.rooms).find((r) => r !== socket.id);
    if (!roomId) return;
    io.to(roomId).emit("clearCanvas");
  });

  socket.on("chatMessage", (msg) => {
    const roomId = Object.keys(socket.rooms).find((r) => r !== socket.id);
    if (!roomId) return;
    io.to(roomId).emit("chatMessage", msg);

    // simple word guessing
    const room = rooms[roomId];
    if (room && msg.text.toLowerCase() === room.word.toLowerCase()) {
      io.to(roomId).emit(
        "correctGuess",
        `${msg.username} guessed the word "${room.word}"!`
      );
      room.word = pickWord();
      const drawer = room.players[room.drawerIndex];
      io.to(drawer.id).emit("newWord", room.word);
    }
  });

  socket.on("disconnect", () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const index = room.players.findIndex((p) => p.id === socket.id);
      if (index !== -1) {
        const name = room.players[index].name;
        room.players.splice(index, 1);

        io.to(roomId).emit(
          "chatMessage",
          { system: true, text: `${name} left the game.` }
        );
        io.to(roomId).emit("updatePlayers", room.players.map((p) => p.name));

        if (room.players.length === 0) delete rooms[roomId];
      }
    }
  });
});

httpServer.listen(3000, () => console.log("Socket.IO server running on port 3000"));
