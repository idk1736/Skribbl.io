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
  const username = location.state?.username || "Player";

  const [socket, setSocket] = useState(null);
  const [players, setPlayers] = useState([]);
  const [host, setHost] = useState(null);
  const [drawer, setDrawer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [canStart, setCanStart] = useState(false);
  const [settings, setSettings] = useState({
    allowGuess: true,
    showHints: true,
  });

  const chatEndRef = useRef(null);

  /** Scroll chat to bottom whenever messages update */
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  /** Initialize socket and events */
  useEffect(() => {
    const s = initSocket();
    setSocket(s);

    // Join the room
    s.emit("joinRoom", { roomCode: roomId, username });

    // --- Player Updates ---
    s.on("updatePlayers", (playerList) => {
      setPlayers(playerList);
      if (!host && playerList.length) setHost(playerList[0].username);
      setCanStart(playerList.length >= 2 && playerList[0].username === username);
    });

    // --- Drawer Updates ---
    s.on("setDrawer", (drawerName) => setDrawer(drawerName));

    // --- Lobby Chat ---
    s.on("chatMessage", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    // --- Correct Guess Notification ---
    s.on("correctGuess", ({ username: winner }) => {
      setMessages((prev) => [
        ...prev,
        { system: true, text: `${winner} guessed the word! 🎉` },
      ]);
    });

    // --- Game Started ---
    s.on("gameStarted", () => {
      navigate(`/game/${roomId}`, { state: { username } });
    });

    // --- Notifications ---
    s.on("notification", (note) => {
      setNotifications((prev) => [...prev, note]);
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n !== note));
      }, 5000);
    });

    // --- Settings Update from Admin ---
    s.on("settingsUpdate", (newSettings) => {
      setSettings(newSettings);
    });

    return () => s.disconnect();
  }, [roomId]);

  /** Host-only: Start Game */
  const startGame = () => {
    if (!socket) return;
    socket.emit("startGame", { roomCode: roomId });
  };

  /** Send Chat Message */
  const sendMessage = () => {
    if (!chatInput.trim() || !socket) return;
    socket.emit("chatMessage", { roomCode: roomId, username, message: chatInput });
    setChatInput("");
  };

  /** Kick a player (host-only) */
  const kickPlayer = (playerName) => {
    if (!socket || !isHost || playerName === host) return;
    socket.emit("kickPlayer", { roomCode: roomId, target: playerName });
  };

  /** Toggle settings (host-only) */
  const toggleSetting = (key) => {
    const newVal = !settings[key];
    setSettings((prev) => ({ ...prev, [key]: newVal }));
    if (socket) socket.emit("updateSetting", { roomCode: roomId, key, value: newVal });
  };

  const isHost = host === username;

  return (
    <div className="flex flex-col md:flex-row w-full max-w-6xl p-4 gap-6">
      {/* Left Panel: Player List & Host Controls */}
      <div className="flex flex-col w-full md:w-1/2 gap-6">
        <Card className="flex flex-col gap-4 p-6">
          <h2 className="text-3xl font-display text-purple text-center">Lobby: {roomId}</h2>

          {/* Players */}
          <h3 className="text-xl font-bold text-pink">Players</h3>
          <ul className="flex flex-col gap-2">
            {players.map((p) => (
              <li
                key={p.username}
                className={`p-2 rounded-xl flex justify-between items-center ${
                  p.username === host ? "bg-yellow font-bold" : "bg-blue-200"
                }`}
              >
                <span>
                  {p.username} {p.username === host ? "(Host)" : ""}{" "}
                  {p.username === drawer ? "🎨" : ""}
                </span>
                {isHost && p.username !== host && (
                  <Button
                    onClick={() => kickPlayer(p.username)}
                    className="bg-red text-white text-xs px-2 py-1"
                  >
                    Kick
                  </Button>
                )}
              </li>
            ))}
          </ul>

          {/* Start Game Button */}
          <Button
            onClick={startGame}
            disabled={!canStart}
            className={`mt-4 ${canStart ? "bg-green" : "bg-gray-400 cursor-not-allowed"}`}
          >
            {players.length < 2
              ? "Waiting for players..."
              : isHost
              ? "Start Game"
              : "Waiting for host..."}
          </Button>

          {/* Host Settings */}
          {isHost && (
            <div className="mt-6">
              <h3 className="text-lg font-bold">Host Settings</h3>
              <div className="flex flex-col gap-2">
                {Object.keys(settings).map((key) => (
                  <label key={key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings[key]}
                      onChange={() => toggleSetting(key)}
                    />
                    {key}
                  </label>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Right Panel: Chat & Notifications */}
      <div className="flex flex-col w-full md:w-1/2 gap-4">
        {/* Chat */}
        <Card className="flex flex-col gap-2 h-full">
          <h3 className="text-lg font-bold">Lobby Chat</h3>
          <ul className="flex flex-col gap-1 flex-1 overflow-y-auto p-2 border rounded max-h-[400px]">
            {messages.map((m, i) => (
              <li key={i} className={m.system ? "italic text-gray-500" : ""}>
                {m.system ? m.text : `${m.username}: ${m.message}`}
              </li>
            ))}
            <div ref={chatEndRef}></div>
          </ul>
          <div className="flex gap-2 mt-2">
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message..."
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <Button onClick={sendMessage}>Send</Button>
          </div>
        </Card>

        {/* Notifications */}
        <AnimatePresence>
          {notifications.map((note, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-2 bg-purple-200 rounded shadow-sm text-sm font-semibold text-purple-800"
            >
              {note}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
