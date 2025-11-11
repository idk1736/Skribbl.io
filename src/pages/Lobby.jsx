import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { initSocket } from "../utils/socket";

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
  const [gameStarted, setGameStarted] = useState(false);
  const chatEndRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    const s = initSocket();
    setSocket(s);

    // Join the room
    s.emit("join-room", { roomCode: roomId, username });

    // ✅ Listen for player list updates
    s.on("player-list", (playerList) => {
      setPlayers(playerList.map((p) => p.username));
      if (playerList.length > 0 && !host) setHost(playerList[0].username);
    });

    // ✅ Drawer updates
    s.on("you-are-drawer", () => setDrawer(username));
    s.on("new-drawer", ({ drawer: drawerName }) => setDrawer(drawerName));

    // ✅ Chat updates
    s.on("chat-message", (msg) => setMessages((prev) => [...prev, msg]));
    s.on("user-typing", ({ username: typingUser }) => {
      if (!typingUsers.includes(typingUser)) {
        setTypingUsers((prev) => [...prev, typingUser]);
        setTimeout(
          () => setTypingUsers((prev) => prev.filter((u) => u !== typingUser)),
          2000
        );
      }
    });

    // ✅ Game start event from server
    s.on("gameStarted", () => {
      setGameStarted(true);
      navigate(`/game/${roomId}`, { state: { username } });
    });

    // ✅ Handle disconnects gracefully
    s.on("disconnect", () => {
      console.warn("Disconnected from server");
    });

    return () => s.disconnect();
  }, []);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!chatInput.trim() || !socket) return;
    socket.emit("chat-message", { message: chatInput });
    setChatInput("");
  };

  const handleTyping = () => {
    if (!socket) return;
    socket.emit("typing", { username });
  };

  // ✅ Start game — sends event to backend
  const startGame = () => {
    if (!socket || !isHost || players.length < 2) return;
    socket.emit("startGame", { roomCode: roomId });
  };

  const isHost = host === username;

  return (
    <div className="flex flex-col md:flex-row gap-6 p-4 max-w-7xl mx-auto w-full">
      {/* Left: Player List & Controls */}
      <div className="flex flex-col gap-4 w-full md:w-1/3">
        <Card className="flex flex-col gap-4">
          <h2 className="text-3xl font-bold text-purple text-center">
            Lobby: {roomId}
          </h2>

          <h3 className="text-xl font-semibold text-pink">
            Players ({players.length})
          </h3>

          <ul className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
            {players.map((p) => (
              <li
                key={p}
                className={`p-2 rounded-xl ${
                  p === host
                    ? "bg-yellow font-bold"
                    : p === drawer
                    ? "bg-pink-200"
                    : "bg-blue-100"
                }`}
              >
                {p}{" "}
                {p === host && <span className="text-yellow-600">👑</span>}
                {p === drawer && <span className="ml-1 text-pink-500">🎨</span>}
              </li>
            ))}
          </ul>

          <Button
            onClick={startGame}
            disabled={!isHost || players.length < 2 || gameStarted}
            className={`mt-4 ${
              isHost ? "bg-green" : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            {gameStarted
              ? "Game Started"
              : players.length < 2
              ? "Waiting for players..."
              : "Start Game"}
          </Button>
        </Card>
      </div>

      {/* Right: Lobby Chat */}
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
                {typingUsers.join(", ")}{" "}
                {typingUsers.length === 1 ? "is" : "are"} typing...
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
