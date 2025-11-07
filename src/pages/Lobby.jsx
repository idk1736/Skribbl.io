import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { initSocket } from "../utils/socket";
import { motion } from "framer-motion";

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
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState("");
  const [roomStatus, setRoomStatus] = useState("Waiting for players...");
  const [roomReady, setRoomReady] = useState(false);
  const [connectionState, setConnectionState] = useState("connecting");

  // prettier join animation variants
  const playerListVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  // initialize socket and event listeners
  useEffect(() => {
    const s = initSocket();
    setSocket(s);

    // Join room
    s.emit("join-room", { roomCode: roomId, username, password });

    // Connection feedback
    s.on("connect", () => setConnectionState("connected"));
    s.on("disconnect", () => setConnectionState("disconnected"));

    // Receive player list updates
    s.on("room-update", ({ players, host, isPrivate }) => {
      setPlayers(players);
      setHost(host);
      setIsPrivate(isPrivate);
      setRoomReady(players.length >= 2);
    });

    // Drawer assignment
    s.on("drawer-selected", ({ drawer }) => {
      setDrawer(drawer);
      setMessages((prev) => [
        ...prev,
        { system: true, text: `${drawer} is now the drawer 🎨` },
      ]);
    });

    // Chat messages
    s.on("chat-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    // Correct guess announcements
    s.on("correct-guess", ({ username }) => {
      setMessages((prev) => [
        ...prev,
        { system: true, text: `${username} guessed the word! 🎉` },
      ]);
    });

    // Game start event
    s.on("game-started", () => {
      navigate(`/game/${roomId}`, { state: { username } });
    });

    // Admin monitoring hook
    s.on("admin-request-room-data", () => {
      s.emit("admin-room-data", {
        roomId,
        players,
        host,
        drawer,
      });
    });

    // Handle private room authentication
    s.on("password-required", () => {
      const userPassword = prompt("This room is password protected. Enter password:");
      s.emit("submit-password", { password: userPassword });
    });

    s.on("password-incorrect", () => {
      alert("Incorrect password. Redirecting to homepage...");
      navigate("/");
    });

    // Handle room closure
    s.on("room-closed", () => {
      alert("This room has been closed by the host.");
      navigate("/");
    });

    return () => s.disconnect();
  }, []);

  // Start game
  const handleStartGame = () => {
    if (!socket) return;
    socket.emit("start-game", { roomCode: roomId });
  };

  // Send chat message
  const sendMessage = () => {
    if (!chatInput.trim() || !socket) return;
    socket.emit("chat-message", { username, message: chatInput });
    setChatInput("");
  };

  const isHost = host === username;

  const connectionColor =
    connectionState === "connected"
      ? "text-green-500"
      : connectionState === "connecting"
      ? "text-yellow-500"
      : "text-red-500";

  return (
    <div className="flex flex-col md:flex-row items-start justify-center w-full max-w-6xl p-4 gap-6">
      {/* Left: Lobby Info */}
      <div className="flex flex-col w-full md:w-1/2 gap-6">
        <Card className="w-full flex flex-col gap-4 bg-gradient-to-b from-blue-50 to-white shadow-xl border border-purple-100">
          <h2 className="text-3xl font-display text-purple text-center">
            🎮 Lobby: {roomId}
          </h2>

          <div className="flex justify-between items-center">
            <p className={`text-sm ${connectionColor}`}>
              Status: {connectionState.toUpperCase()}
            </p>
            {isPrivate && (
              <p className="text-sm text-pink font-semibold">
                🔒 Private Room
              </p>
            )}
          </div>

          <div className="flex flex-col">
            <h3 className="text-xl font-bold text-pink mb-2">Players</h3>
            <ul className="flex flex-col gap-2 overflow-y-auto max-h-[300px] pr-2">
              {players.length === 0 ? (
                <p className="italic text-gray-400">Waiting for players...</p>
              ) : (
                players.map((p, i) => (
                  <motion.li
                    key={`${p.username}-${i}`}
                    variants={playerListVariants}
                    initial="hidden"
                    animate="visible"
                    className={`p-2 rounded-xl shadow-sm flex justify-between items-center ${
                      p.username === host
                        ? "bg-yellow-200 font-semibold"
                        : "bg-blue-100"
                    }`}
                  >
                    <span>
                      {p.username}{" "}
                      {p.username === host && "(Host)"}{" "}
                      {p.username === drawer && "🎨"}
                    </span>
                    <span className="text-xs text-gray-500">
                      {p.score ?? 0} pts
                    </span>
                  </motion.li>
                ))
              )}
            </ul>
          </div>

          <div className="flex justify-center mt-4">
            <Button
              onClick={handleStartGame}
              disabled={!isHost || !roomReady}
              className={`px-6 py-2 text-white font-semibold rounded-lg ${
                isHost && roomReady
                  ? "bg-gradient-to-r from-green-400 to-green-600 hover:shadow-lg"
                  : "bg-gray-300 cursor-not-allowed"
              }`}
            >
              {roomReady
                ? isHost
                  ? "🚀 Start Game"
                  : "Waiting for Host..."
                : "Waiting for Players..."}
            </Button>
          </div>
        </Card>

        {/* Info Section */}
        <Card className="p-4 text-center text-gray-600">
          <p className="text-sm">
            <strong>Room Mode:</strong>{" "}
            {isPrivate ? "Password Protected 🔒" : "Public 🌍"}
          </p>
          {isPrivate && (
            <p className="text-sm mt-2">
              Share password carefully. Only players with it can join.
            </p>
          )}
          <p className="text-xs text-gray-400 mt-4">
            You can leave anytime using the top navigation.
          </p>
        </Card>
      </div>

      {/* Right: Lobby Chat */}
      <div className="flex flex-col w-full md:w-1/2 gap-4">
        <Card className="flex flex-col gap-2 h-full bg-gradient-to-br from-purple-50 to-white border border-purple-100 shadow-lg">
          <h3 className="text-lg font-bold text-purple-700 border-b border-purple-100 pb-1">
            Lobby Chat 💬
          </h3>

          <ul className="flex flex-col gap-1 flex-1 overflow-y-auto p-2 rounded max-h-[500px] scrollbar-thin scrollbar-thumb-purple-200">
            {messages.map((m, i) => (
              <li
                key={i}
                className={`text-sm ${
                  m.system
                    ? "italic text-gray-500"
                    : "text-gray-700 font-medium"
                }`}
              >
                {m.system
                  ? m.text
                  : `${m.username || "Unknown"}: ${m.message}`}
              </li>
            ))}
          </ul>

          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 p-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-300 outline-none"
              placeholder="Type a message..."
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <Button
              onClick={sendMessage}
              className="bg-purple-500 text-white hover:bg-purple-600 px-4 py-2 rounded-lg shadow"
            >
              Send
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
