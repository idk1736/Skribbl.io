import React, { useState, useEffect } from "react";
import { Users, Gamepad2, PlusCircle, Loader2, Sparkles } from "lucide-react";

// ============================================================================
// Minimal UI Components
// ============================================================================
const Card = ({ children, className = "" }) => (
  <div
    className={`bg-white/70 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl border border-gray-300 dark:border-gray-700 shadow-lg transition-all duration-300 ${className}`}
  >
    {children}
  </div>
);

const Button = ({
  children,
  variant = "primary",
  size = "md",
  icon: Icon,
  onClick,
  disabled,
  className = "",
}) => {
  const variants = {
    primary:
      "bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white",
    secondary:
      "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600",
    success:
      "bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-6 py-2.5 text-base",
    lg: "px-8 py-3.5 text-lg",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${variants[variant]} ${sizes[size]} rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {Icon && (
        <Icon
          size={size === "sm" ? 16 : size === "lg" ? 24 : 20}
          className="opacity-80"
        />
      )}
      {children}
    </button>
  );
};

const Input = ({ placeholder, value, onChange, className = "" }) => (
  <input
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    className={`w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-900/60 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
  />
);

// ============================================================================
// MAIN LOBBY COMPONENT
// ============================================================================
const Lobby = ({ onJoinRoom, onCreateRoom }) => {
  const [username, setUsername] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [activeGames, setActiveGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    // Example Data
    setActiveGames([
      { id: "ROOM1", host: "Alice", players: 3, max: 8 },
      { id: "ROOM2", host: "Ben", players: 5, max: 10 },
      { id: "ROOM3", host: "Cleo", players: 2, max: 6 },
    ]);
  }, []);

  const handleCreate = () => {
    if (!username.trim()) return;
    setLoading(true);
    setTimeout(() => {
      onCreateRoom(username);
      setLoading(false);
    }, 600);
  };

  const handleJoin = () => {
    if (!username.trim() || !roomCode.trim()) return;
    setLoading(true);
    setTimeout(() => {
      onJoinRoom(username, roomCode);
      setLoading(false);
    }, 600);
  };

  const quickJoin = (id) => {
    if (!username.trim()) return;
    setLoading(true);
    setTimeout(() => {
      onJoinRoom(username, id);
      setLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-white flex flex-col">
      {/* HEADER */}
      <header className="py-8 text-center">
        <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500 drop-shadow-sm">
          Skribbl Lobby
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300 text-lg">
          Create, Join, or Browse Active Games
        </p>
      </header>

      {/* CONTENT */}
      <main className="flex-grow container mx-auto px-4 grid md:grid-cols-2 gap-8 mb-12">
        {/* CREATE / JOIN SECTION */}
        <Card className="p-8 flex flex-col justify-center">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Users className="text-blue-500" /> Get Started
          </h2>
          <div className="space-y-4">
            <Input
              placeholder="Enter your name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            {!creating ? (
              <>
                <Input
                  placeholder="Room Code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                />
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleJoin}
                  disabled={!username.trim() || !roomCode.trim() || loading}
                  icon={Users}
                  className="w-full"
                >
                  {loading ? <Loader2 className="animate-spin" /> : "Join Room"}
                </Button>
              </>
            ) : (
              <Button
                variant="success"
                size="lg"
                onClick={handleCreate}
                disabled={!username.trim() || loading}
                icon={PlusCircle}
                className="w-full"
              >
                {loading ? <Loader2 className="animate-spin" /> : "Create Room"}
              </Button>
            )}

            <Button
              variant="secondary"
              size="md"
              onClick={() => setCreating(!creating)}
              className="w-full"
            >
              {creating ? "Join an Existing Room" : "Create New Room"}
            </Button>
          </div>
        </Card>

        {/* ACTIVE GAMES SECTION */}
        <Card className="p-8">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Gamepad2 className="text-indigo-500" /> Active Games
          </h2>
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
            {activeGames.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400 text-center py-12">
                No active games currently.
              </p>
            ) : (
              activeGames.map((g) => (
                <div
                  key={g.id}
                  className="flex justify-between items-center p-4 bg-white/80 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all"
                >
                  <div>
                    <p className="font-semibold text-lg">{g.id}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Host: {g.host}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Players: {g.players}/{g.max}
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => quickJoin(g.id)}
                    disabled={!username.trim() || loading}
                  >
                    Join
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>
      </main>

      {/* FEATURES SECTION */}
      <section className="bg-white/70 dark:bg-gray-800/70 py-10 border-t border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 grid sm:grid-cols-3 gap-8 text-center">
          {[
            {
              icon: Users,
              title: "Play with Friends",
              desc: "Instantly join or create custom lobbies.",
            },
            {
              icon: Sparkles,
              title: "Customizable Games",
              desc: "Set your own rounds, word lists, and settings.",
            },
            {
              icon: Gamepad2,
              title: "Live Multiplayer",
              desc: "Experience smooth, fast real-time gameplay.",
            },
          ].map((f, i) => (
            <div key={i} className="space-y-2">
              <f.icon
                size={40}
                className="mx-auto text-blue-500 dark:text-indigo-400"
              />
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="text-gray-600 dark:text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Lobby;
