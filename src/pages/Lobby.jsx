import React, { useState, useEffect, useRef } from "react";
import {
  Users,
  Settings,
  Clock,
  Layers,
  MessageSquare,
  ThumbsUp,
  Send,
  Shield,
  XCircle,
  CheckCircle2,
  Wand2,
} from "lucide-react";

// ============================================================================
// Utility Components
// ============================================================================
const Card = ({ children, className = "" }) => (
  <div
    className={`bg-white/70 dark:bg-gray-800/80 backdrop-blur-md border border-gray-300 dark:border-gray-700 rounded-2xl shadow-md p-5 transition-all ${className}`}
  >
    {children}
  </div>
);

const Button = ({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled,
  icon: Icon,
  className = "",
}) => {
  const variants = {
    primary:
      "bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white",
    secondary:
      "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600",
    danger:
      "bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-5 py-2 text-base",
    lg: "px-7 py-3 text-lg",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${variants[variant]} ${sizes[size]} rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${className}`}
    >
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

const Input = ({ value, onChange, placeholder, type = "text" }) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className="w-full rounded-lg px-4 py-2 bg-white dark:bg-gray-900/60 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
  />
);

// ============================================================================
// MAIN LOBBY COMPONENT
// ============================================================================
const Lobby = ({ socket, user, roomCode, isHost }) => {
  const [players, setPlayers] = useState([
    { id: 1, name: "Alice", ready: true },
    { id: 2, name: "Ben", ready: false },
    { id: 3, name: "Cleo", ready: false },
  ]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");

  // Game settings (host controls)
  const [settings, setSettings] = useState({
    rounds: 3,
    drawTime: 80,
    wordDifficulty: "Normal",
    customWords: "",
  });

  // Player requests
  const [requests, setRequests] = useState([]);

  const chatRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Simulated backend hooks
  useEffect(() => {
    // In your real app:
    // socket.on('player_joined', (player) => setPlayers([...players, player]));
    // socket.on('chat_message', (msg) => setChatMessages([...chatMessages, msg]));
  }, []);

  const sendChat = () => {
    if (!chatInput.trim()) return;
    const msg = { user: user?.name || "You", text: chatInput };
    setChatMessages((prev) => [...prev, msg]);
    setChatInput("");
  };

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    // socket.emit("update_settings", { key, value });
  };

  const toggleReady = (id) => {
    setPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ready: !p.ready } : p))
    );
  };

  const handleRequest = (type, detail) => {
    const newRequest = {
      id: Date.now(),
      type,
      detail,
      from: user?.name || "Anonymous",
    };
    setRequests((r) => [...r, newRequest]);
    // socket.emit('setting_request', newRequest);
  };

  const startGame = () => {
    // socket.emit('start_game');
    console.log("Game started with settings:", settings);
  };

  // ========================================================================
  // RENDER
  // ========================================================================
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col p-4 sm:p-6">
      {/* HEADER */}
      <header className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
          Lobby — {roomCode || "ROOM123"}
        </h1>
        {isHost && (
          <Button variant="primary" size="md" icon={Wand2} onClick={startGame}>
            Start Game
          </Button>
        )}
      </header>

      <div className="grid md:grid-cols-3 gap-6 flex-grow">
        {/* LEFT: Players */}
        <Card className="md:col-span-1 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Users className="text-blue-500" /> Players ({players.length})
            </h2>
          </div>
          <div className="flex-grow overflow-y-auto space-y-2 custom-scrollbar">
            {players.map((p) => (
              <div
                key={p.id}
                className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2"
              >
                <span className="font-medium">{p.name}</span>
                <Button
                  size="sm"
                  variant={p.ready ? "success" : "secondary"}
                  onClick={() => toggleReady(p.id)}
                >
                  {p.ready ? (
                    <>
                      <CheckCircle2 size={16} /> Ready
                    </>
                  ) : (
                    <>
                      <XCircle size={16} /> Not Ready
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </Card>

        {/* MIDDLE: Game Settings */}
        <Card className="md:col-span-1 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Settings className="text-indigo-500" /> Game Settings
            </h2>
          </div>
          <div className="space-y-4 flex-grow">
            <div>
              <label className="block text-sm font-medium">Rounds</label>
              <input
                type="range"
                min="1"
                max="10"
                value={settings.rounds}
                onChange={(e) => updateSetting("rounds", e.target.value)}
                className="w-full"
              />
              <p className="text-sm text-gray-600">{settings.rounds} rounds</p>
            </div>
            <div>
              <label className="block text-sm font-medium">Draw Time</label>
              <input
                type="range"
                min="30"
                max="120"
                step="5"
                value={settings.drawTime}
                onChange={(e) => updateSetting("drawTime", e.target.value)}
                className="w-full"
              />
              <p className="text-sm text-gray-600">
                {settings.drawTime} seconds
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium">
                Word Difficulty
              </label>
              <select
                value={settings.wordDifficulty}
                onChange={(e) =>
                  updateSetting("wordDifficulty", e.target.value)
                }
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900/70 px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option>Easy</option>
                <option>Normal</option>
                <option>Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Custom Words</label>
              <textarea
                rows="2"
                placeholder="Comma separated list..."
                value={settings.customWords}
                onChange={(e) =>
                  updateSetting("customWords", e.target.value)
                }
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900/70 px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {!isHost && (
            <div className="pt-4 border-t border-gray-300 dark:border-gray-700">
              <h3 className="font-semibold mb-2">Request a Change</h3>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleRequest("extraRound", "Add a round")}
                >
                  + Round
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    handleRequest("moreTime", "Increase draw time")
                  }
                >
                  + Time
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* RIGHT: Chat */}
        <Card className="md:col-span-1 flex flex-col">
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <MessageSquare className="text-blue-500" /> Lobby Chat
          </h2>
          <div
            ref={chatRef}
            className="flex-grow overflow-y-auto bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2 custom-scrollbar max-h-[300px]"
          >
            {chatMessages.length === 0 ? (
              <p className="text-gray-500 text-center py-6 text-sm">
                No messages yet...
              </p>
            ) : (
              chatMessages.map((m, i) => (
                <div key={i} className="text-sm">
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {m.user}:
                  </span>{" "}
                  <span className="text-gray-800 dark:text-gray-200">
                    {m.text}
                  </span>
                </div>
              ))
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message..."
            />
            <Button variant="primary" icon={Send} onClick={sendChat} />
          </div>
        </Card>
      </div>

      {/* REQUEST SECTION */}
      {isHost && requests.length > 0 && (
        <Card className="mt-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Shield className="text-yellow-500" /> Player Requests
          </h2>
          <div className="space-y-2">
            {requests.map((r) => (
              <div
                key={r.id}
                className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2"
              >
                <span>
                  <strong>{r.from}</strong> requested: {r.detail}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() =>
                      setRequests((reqs) => reqs.filter((x) => x.id !== r.id))
                    }
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() =>
                      setRequests((reqs) => reqs.filter((x) => x.id !== r.id))
                    }
                  >
                    Deny
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default Lobby;
