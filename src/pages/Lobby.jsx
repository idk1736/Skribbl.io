import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Globe, LogIn, PlusCircle, RefreshCw, Crown, MessageSquare } from "lucide-react";
import { io } from "socket.io-client";

// --- Utility Components ---
const Card = ({ children, className = "" }) => (
  <div className={`bg-white/10 backdrop-blur-lg border border-white/20 shadow-xl rounded-2xl p-4 ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ children }) => <div className="mb-2 font-semibold text-indigo-200 text-lg">{children}</div>;
const CardContent = ({ children, className = "" }) => <div className={className}>{children}</div>;

const Button = ({ children, onClick, className = "" }) => (
  <button
    onClick={onClick}
    className={`bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg transition-all ${className}`}
  >
    {children}
  </button>
);

const Input = ({ value, onChange, placeholder, className = "", onKeyDown }) => (
  <input
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    onKeyDown={onKeyDown}
    className={`w-full px-3 py-2 rounded-lg bg-white/10 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all ${className}`}
  />
);

// --- Socket ---
const socket = io("/", { transports: ["websocket"] });

export default function Lobby() {
  const [username, setUsername] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [rooms, setRooms] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [announcements, setAnnouncements] = useState([]);

  // Fetch active rooms
  const fetchRooms = async () => {
    try {
      const res = await fetch("/api/rooms");
      const data = await res.json();
      setRooms(data.rooms || []);
    } catch (err) {
      console.error("Failed to fetch rooms", err);
    }
  };

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 8000);

    socket.on("global-chat", (msg) => setChatMessages((prev) => [...prev, msg]));
    socket.on("announcement", (msg) => setAnnouncements((prev) => [msg, ...prev.slice(0, 4)]));

    return () => clearInterval(interval);
  }, []);

  const sendMessage = () => {
    if (!message.trim() || !username.trim()) return;
    socket.emit("global-chat", { username, message });
    setMessage("");
  };

  const handleCreateRoom = () => {
    if (!username.trim()) return alert("Enter username!");
    socket.emit("create-room", { username });
  };

  const handleJoinRoom = () => {
    if (!username.trim() || !roomCode.trim()) return alert("Enter username & room code!");
    socket.emit("join-room", { username, roomCode });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 flex flex-col items-center p-4 text-white">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-5xl font-extrabold bg-gradient-to-r from-purple-400 via-indigo-300 to-blue-400 text-transparent bg-clip-text mb-4"
      >
        Scribbly Royale
      </motion.h1>
      <p className="text-indigo-300 mb-8 text-lg">Create, Join, and Compete — live global chat!</p>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 w-full max-w-7xl flex-grow">
        {/* Create / Join */}
        <div className="space-y-4 lg:col-span-1">
          <Card>
            <CardHeader>Join or Create Room</CardHeader>
            <CardContent className="space-y-2">
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
              <div className="flex gap-2">
                <Input value={roomCode} onChange={(e) => setRoomCode(e.target.value)} placeholder="Room Code" />
                <Button onClick={handleJoinRoom}>
                  <LogIn className="inline w-4 h-4 mr-1" /> Join
                </Button>
              </div>
              <Button onClick={handleCreateRoom}>
                <PlusCircle className="inline w-4 h-4 mr-1" /> Create
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Active Rooms */}
        <div className="lg:col-span-2 flex flex-col">
          <Card className="flex flex-col flex-grow">
            <CardHeader className="flex justify-between items-center">
              <span className="flex items-center gap-2">
                <Globe className="w-5 h-5" /> Active Games
              </span>
              <Button onClick={fetchRooms} className="bg-indigo-500 hover:bg-indigo-600">
                <RefreshCw className="inline w-4 h-4" /> Refresh
              </Button>
            </CardHeader>
            <CardContent className="overflow-y-auto flex-grow mt-2 space-y-2">
              {rooms.length === 0 ? (
                <p className="text-indigo-300 text-center">No active rooms</p>
              ) : (
                rooms.map((room, idx) => (
                  <Card key={idx} className="p-3 cursor-pointer hover:scale-105 transition-all">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-indigo-100">Room {room.roomCode}</p>
                        <p className="text-sm text-indigo-300">{room.playerCount} players</p>
                      </div>
                      {room.gameStarted && <Crown className="text-yellow-400 w-5 h-5" />}
                    </div>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Global Chat & Announcements */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="flex flex-col h-72">
            <CardHeader className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" /> Global Chat
            </CardHeader>
            <CardContent className="flex flex-col flex-grow overflow-y-auto mb-2">
              {chatMessages.map((msg, i) => (
                <p key={i} className="text-sm">
                  <span className="text-indigo-300 font-semibold">{msg.username}: </span>
                  <span className="text-indigo-100">{msg.message}</span>
                </p>
              ))}
            </CardContent>
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Type message..."
              />
              <Button onClick={sendMessage}>Send</Button>
            </div>
          </Card>

          <Card className="h-40 overflow-y-auto">
            <CardHeader>Announcements</CardHeader>
            <CardContent>
              {announcements.map((a, i) => (
                <p key={i} className="text-sm text-indigo-100">
                  🔔 {a.message}
                </p>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
