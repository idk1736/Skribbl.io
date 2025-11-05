import { Server } from "socket.io";

let io;
const rooms = {}; // { roomId: { players: {}, drawer: null, word: "" } }

// 🎨 Massive word list
const words = [
  "apple", "banana", "car", "house", "tree", "dog", "cat", "pizza", "boat", "sun",
  "moon", "star", "computer", "phone", "keyboard", "mouse", "bottle", "book",
  "table", "chair", "window", "door", "flower", "grass", "mountain", "river",
  "cloud", "rain", "snow", "fire", "ice", "ocean", "fish", "bird", "horse",
  "lion", "tiger", "bear", "elephant", "giraffe", "snake", "frog", "carrot",
  "burger", "sandwich", "cake", "cookie", "donut", "ice cream", "coffee",
  "tea", "milk", "juice", "water", "pencil", "pen", "eraser", "paint", "brush",
  "camera", "television", "radio", "lamp", "bed", "pillow", "blanket", "clock",
  "watch", "hat", "shoe", "shirt", "pants", "dress", "coat", "scarf", "ring",
  "ball", "soccer", "basketball", "baseball", "football", "golf", "tennis",
  "volleyball", "swimming", "running", "jumping", "dancing", "singing",
  "laughing", "crying", "sleeping", "flying", "driving", "reading", "writing",
  "drawing", "building", "cooking", "baking", "cleaning", "shopping", "working",
  "teaching", "doctor", "nurse", "teacher", "student", "pilot", "chef",
  "police", "firefighter", "astronaut", "artist", "musician", "actor",
  "superhero", "robot", "alien", "monster", "ghost", "zombie", "vampire",
  "witch", "wizard", "castle", "king", "queen", "prince", "princess", "dragon",
  "unicorn", "rainbow", "island", "forest", "desert", "beach", "volcano",
  "bridge", "tower", "road", "train", "plane", "ship", "bus", "bicycle",
  "motorcycle", "rocket", "camera", "mirror", "toothbrush", "toilet", "sink",
  "bathtub", "soap", "towel", "basket", "bag", "wallet", "key", "phone case",
  "battery", "charger", "headphones", "microphone", "speaker", "drum", "guitar",
  "piano", "violin", "flute", "trumpet", "map", "flag", "globe", "earth", "planet",
  "satellite", "space", "starfish", "shark", "whale", "dolphin", "crab", "octopus",
  "penguin", "polar bear", "camel", "kangaroo", "koala", "owl", "eagle", "peacock",
  "spider", "butterfly", "bee", "ant", "snake", "turtle", "lizard", "frog",
  "cupcake", "cheese", "bread", "apple pie", "pancake", "muffin", "popcorn",
  "salad", "soup", "steak", "chicken", "fish sticks", "french fries", "hotdog",
  "hamburger", "spaghetti", "sushi", "taco", "burrito", "noodles", "rice", "egg",
  "sunflower", "rose", "tulip", "treehouse", "campfire", "tent", "flashlight",
  "mountain", "waterfall", "bridge", "city", "building", "apartment", "park",
  "garden", "statue", "museum", "library", "school", "hospital", "zoo", "farm",
  "factory", "airport", "harbor", "stadium", "theater", "circus", "mall", "market",
  "restaurant", "bakery", "supermarket", "bank", "church", "temple", "mosque"
];

export default function handler(req, res) {
  if (!res.socket.server.io) {
    io = new Server(res.socket.server, {
      path: "/api/socket",
      cors: { origin: "*" },
    });
    res.socket.server.io = io;

    io.on("connection", (socket) => {
      console.log("Client connected:", socket.id);

      socket.on("joinRoom", ({ roomId, username }) => {
        socket.join(roomId);
        if (!rooms[roomId]) {
          rooms[roomId] = { players: {}, drawer: null, word: "" };
        }
        rooms[roomId].players[socket.id] = username;
        io.to(roomId).emit("updatePlayers", Object.values(rooms[roomId].players));
      });

      socket.on("startGame", () => {
        const roomId = getRoom(socket);
        if (!roomId || !rooms[roomId]) return;
        const room = rooms[roomId];
        const ids = Object.keys(room.players);
        if (!ids.length) return;

        const drawerId = ids[Math.floor(Math.random() * ids.length)];
        room.drawer = drawerId;
        room.word = words[Math.floor(Math.random() * words.length)];

        io.to(roomId).emit("gameStarted");
        io.to(roomId).emit("setDrawer", room.players[drawerId]);
        io.to(drawerId).emit("newWord", room.word);
      });

      socket.on("draw", (data) => {
        const roomId = getRoom(socket);
        if (roomId) socket.to(roomId).emit("draw", data);
      });

      socket.on("clearCanvas", () => {
        const roomId = getRoom(socket);
        if (roomId) io.to(roomId).emit("clearCanvas");
      });

      socket.on("chatMessage", ({ username, text }) => {
        const roomId = getRoom(socket);
        if (!roomId || !rooms[roomId]) return;
        const room = rooms[roomId];
        const { word } = room;

        if (text.trim().toLowerCase() === word.toLowerCase()) {
          io.to(roomId).emit("correctGuess", `${username} guessed the word!`);
          const nextDrawer = nextDrawerId(room);
          room.drawer = nextDrawer;
          room.word = words[Math.floor(Math.random() * words.length)];
          io.to(roomId).emit("setDrawer", room.players[nextDrawer]);
          io.to(nextDrawer).emit("newWord", room.word);
        } else {
          io.to(roomId).emit("chatMessage", { username, text });
        }
      });

      socket.on("disconnect", () => {
        const roomId = getRoom(socket);
        if (!roomId || !rooms[roomId]) return;
        delete rooms[roomId].players[socket.id];
        io.to(roomId).emit("updatePlayers", Object.values(rooms[roomId].players));
      });
    });
  }
  res.end();
}

function getRoom(socket) {
  const joined = Array.from(socket.rooms).filter((r) => r !== socket.id);
  return joined.length ? joined[0] : null;
}

function nextDrawerId(room) {
  const ids = Object.keys(room.players);
  if (!ids.length) return null;
  const current = ids.indexOf(room.drawer);
  return ids[(current + 1) % ids.length];
}
