import React, { useState, useEffect } from "react";
import { Users, Palette, Monitor, Sparkles, Home, Loader2, Circle } from "lucide-react";

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================
const GlassCard = ({ children, className = "", hover = false }) => (
  <div
    className={`bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-xl transition-all duration-300 ${
      hover ? "hover:bg-white/15 hover:shadow-2xl hover:scale-[1.02]" : ""
    } ${className}`}
  >
    {children}
  </div>
);

const Button = ({ children, variant = "primary", size = "md", icon: Icon, onClick, disabled, className = "" }) => {
  const variants = {
    primary: "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg shadow-purple-500/50",
    secondary: "bg-white/10 hover:bg-white/20 text-white border border-white/30",
    success: "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg shadow-green-500/50",
  };
  const sizes = { sm: "px-3 py-1.5 text-sm", md: "px-6 py-3 text-base", lg: "px-8 py-4 text-lg" };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${variants[variant]} ${sizes[size]} rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {Icon && <Icon size={size === "sm" ? 16 : size === "lg" ? 24 : 20} />}
      {children}
    </button>
  );
};

// ============================================================================
// ANIMATED BACKGROUND
// ============================================================================
const AnimatedBackground = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900" />
    {[...Array(15)].map((_, i) => (
      <div
        key={i}
        className="absolute rounded-full mix-blend-screen filter blur-xl opacity-30 animate-float"
        style={{
          width: `${Math.random() * 300 + 100}px`,
          height: `${Math.random() * 300 + 100}px`,
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          background: `radial-gradient(circle, ${["#8b5cf6", "#ec4899", "#3b82f6", "#10b981"][Math.floor(Math.random() * 4)]} 0%, transparent 70%)`,
          animationDelay: `${Math.random() * 5}s`,
          animationDuration: `${Math.random() * 10 + 10}s`,
        }}
      />
    ))}
  </div>
);

// ============================================================================
// LOBBY PAGE
// ============================================================================
const Lobby = ({ onJoinRoom, onCreateRoom }) => {
  const [username, setUsername] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [publicRooms, setPublicRooms] = useState([]);
  const [activeGames, setActiveGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    // Mock Public Rooms
    setPublicRooms([
      { id: "ROOM1", players: 3, maxPlayers: 8, isActive: true, host: "Player1" },
      { id: "ROOM2", players: 2, maxPlayers: 6, isActive: false, host: "Artist99" },
      { id: "ROOM3", players: 5, maxPlayers: 10, isActive: true, host: "DrawMaster" },
    ]);

    // Mock Active Games
    setActiveGames([
      { id: "GAME1", host: "Alice", players: 4, maxPlayers: 8 },
      { id: "GAME2", host: "Bob", players: 2, maxPlayers: 6 },
    ]);
  }, []);

  const handleCreate = () => {
    if (!username.trim()) return;
    setLoading(true);
    setTimeout(() => {
      onCreateRoom(username);
      setLoading(false);
    }, 500);
  };

  const handleJoin = () => {
    if (!username.trim() || !roomCode.trim()) return;
    setLoading(true);
    setTimeout(() => {
      onJoinRoom(username, roomCode);
      setLoading(false);
    }, 500);
  };

  const handleQuickJoin = (id) => {
    if (!username.trim()) return;
    setLoading(true);
    setTimeout(() => {
      onJoinRoom(username, id);
      setLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen p-4">
      <AnimatedBackground />

      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400">Skribbl Lobby</h1>
          <p className="text-xl md:text-2xl text-white/80 font-light mt-2">Join a game or start creating fun!</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Create / Join */}
          <GlassCard className="p-8">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-2">
              <Users className="text-purple-400" />
              Get Started
            </h2>
            <div className="space-y-4">
              <input
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {isCreating ? (
                <Button variant="success" size="lg" icon={Sparkles} onClick={handleCreate} disabled={!username.trim() || loading} className="w-full">
                  {loading ? <Loader2 className="animate-spin" /> : "Create Room"}
                </Button>
              ) : (
                <>
                  <input
                    placeholder="Room code (e.g., ROOM1)"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <Button variant="primary" size="lg" icon={Users} onClick={handleJoin} disabled={!username.trim() || !roomCode.trim() || loading} className="w-full">
                    {loading ? <Loader2 className="animate-spin" /> : "Join Room"}
                  </Button>
                </>
              )}
              <Button variant="secondary" size="md" onClick={() => setIsCreating(!isCreating)} className="w-full">
                {isCreating ? "Join Existing Room" : "Create New Room"}
              </Button>
            </div>
          </GlassCard>

          {/* Active / Public Rooms */}
          <GlassCard className="p-8">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-2">
              <Monitor className="text-blue-400" />
              Active Games
            </h2>
            <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
              {activeGames.length === 0 ? (
                <p className="text-white/60 text-center py-12">No active games</p>
              ) : (
                activeGames.map((game) => (
                  <GlassCard key={game.id} hover className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold">{game.id}</p>
                        <p className="text-sm text-white/60">Host: {game.host}</p>
                        <p className="text-sm text-white/60">
                          Players: {game.players}/{game.maxPlayers}
                        </p>
                      </div>
                      <Button variant="primary" size="sm" onClick={() => handleQuickJoin(game.id)} disabled={!username.trim()}>
                        Join
                      </Button>
                    </div>
                  </GlassCard>
                ))
              )}
            </div>
          </GlassCard>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          {[
            { icon: Palette, title: "Draw & Create", desc: "Express yourself with smooth drawing tools" },
            { icon: Users, title: "Chat & Guess", desc: "Play and chat with friends in real time" },
            { icon: Sparkles, title: "Compete & Win", desc: "Climb leaderboards and show off" },
          ].map((feature, i) => (
            <GlassCard key={i} hover className="p-6 text-center">
              <feature.icon size={48} className="mx-auto mb-4 text-purple-400" />
              <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
              <p className="text-white/60">{feature.desc}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Lobby;
