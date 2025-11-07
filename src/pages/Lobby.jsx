// src/pages/Lobby.jsx
import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { initSocket } from "../utils/socket";
import { motion, AnimatePresence } from "framer-motion";

export default function Lobby() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const username = location.state?.username?.trim() || "Player";

  const [socket, setSocket] = useState(null);
  const [players, setPlayers] = useState([]);
  const [host, setHost] = useState(null);
  const [drawer, setDrawer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [typingUsers, setTypingUsers] = useState([]);
  const [roomInfo, setRoomInfo] = useState({
    word: null,
    round: 0,
    guessedCount: 0,
  });
  const [gameStarted, setGameStarted] = useState(false);
  const chatEndRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    const s = initSocket();
    setSocket(s);

    // Join the room
    s.emit("join-room", { roomCode: roomId, username });

    // Player list updates
    s.on("player-list", (playerList) => {
      // Set host automatically if not set
      if (!host && playerList.length) setHost(playerList[0].username);

      // Update players state
      setPlayers(playerList.map((p) => ({
        username: p.username,
        isDrawer: p.isDrawer,
        isHost: p.username === playerList[0].username,
      })));
    });

    // Drawer updates
    s.on("you-are-drawer", () => setDrawer(username));
    s.on("new-drawer", ({ drawer: drawerName }) => setDrawer(drawerName));

    // Chat messages
    s.on("chat-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    // Correct guesses
    s.on("correct-guess", ({ username: winner }) => {
      setMessages((prev) => [
        ...prev,
        { system: true, text: `${winner} guessed the word! 🎉` },
      ]);
    });

    // Typing indicator
    s.on("user-typing", ({ username: typingUser }) => {
      setTypingUsers((prev) =>
        prev.includes(typingUser) ? prev : [...prev, typingUser]
      );
      setTimeout(() => {
        setTypingUsers((prev) =>
          prev.filter((u) => u !== typingUser)
        );
      }, 3000);
    });

    // Room info updates
    s.on("room-update", (info) => setRoomInfo(info));

    // Game start
    s.on("gameStarted", () => setGameStarted(true));

    // Auto navigate if game starts
    s.on("navigate-game", () => {
      navigate(`/game/${roomId}`, { state: { username } });
    });

    // Cleanup on unmount
    return () => s.disconnect();
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send chat message
  const sendMessage = () => {
    if (!chatInput.trim() || !socket) return;
    socket.emit("chat-message", { message: chatInput });
    setChatInput("");
  };

  // Typing event
  const handleTyping = () => {
    if (!socket) return;
    socket.emit("typing", { username });
  };

  // Start game
  const startGame = () => {
    if (!socket || !isHost || players.length < 2) return;
    socket.emit("startGame");
  };

  const isHost = host === username;

  return (
    <div className="flex flex-col md:flex-row gap-6 p-4 max-w-7xl mx-auto w-full">
      {/* Left: Player List & Host Controls */}
      <div className="flex flex-col gap-4 w-full md:w-1/3">
        <Card className="flex flex-col gap-4">
          <h2 className="text-3xl font-bold text-purple text-center">Lobby: {roomId}</h2>
          <h3 className="text-xl font-semibold text-pink">Players ({players.length})</h3>

          <ul className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
            <AnimatePresence>
              {players.map((p) => (
                <motion.li
                  key={p.username}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`p-2 rounded-xl flex justify-between items-center
                    ${p.isHost ? "bg-yellow font-bold" : "bg-blue-100"} 
                    ${p.isDrawer ? "border-2 border-pink" : ""}`}
                >
                  <span>{p.username}</span>
                  <span>
                    {p.isHost && "👑"} {p.isDrawer && "🎨"}
                  </span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>

          <Button
            onClick={startGame}
            disabled={!isHost || players.length < 2 || gameStarted}
            className={`mt-4 ${isHost ? "bg-green" : "bg-gray-400 cursor-not-allowed"}`}
          >
            {gameStarted
              ? "Game Started"
              : players.length < 2
              ? "Waiting for players..."
              : "Start Game"}
          </Button>

          {isHost && (
            <div className="mt-4 flex flex-col gap-2">
              <h4 className="font-semibold text-purple">Room Info (Host Controls)</h4>
              <p>Round: {roomInfo.round}</p>
              <p>Current Word: {roomInfo.word || "N/A"}</p>
              <p>Guessed: {roomInfo.guessedCount}</p>
            </div>
          )}
        </Card>
      </div>

      {/* Right: Chat + Typing Indicators */}
      <div className="flex flex-col gap-4 w-full md:w-2/3">
        <Card className="flex flex-col gap-2 h-full">
          <h3 className="text-lg font-bold">Lobby Chat</h3>
          <ul className="flex flex-col gap-1 flex-1 overflow-y-auto p-2 border rounded max-h-[500px]">
            {messages.map((m, i) => (
              <li
                key={i}
                className={`${
                  m.system ? "italic text-gray-500" : "text-black"
                }`}
              >
                {m.system ? m.text : `${m.username}: ${m.message}`}
              </li>
            ))}
            {typingUsers.length > 0 && (
              <li className="italic text-gray-400">
                {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
              </li>
            )}
            <div ref={chatEndRef}></div>
          </ul>
          <div className="flex gap-2 mt-2">
            <Input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
                else handleTyping();
              }}
              placeholder="Type a message..."
              className="flex-1 p-2 border rounded"
            />
            <Button onClick={sendMessage}>Send</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
