import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { io } from "socket.io-client";
import { Users, Globe, LogIn, PlusCircle, RefreshCw, Crown, MessageSquare } from "lucide-react";

const socket = io("/", { transports: ["websocket"] });

export default function Lobby() {
  const [username, setUsername] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [rooms, setRooms] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [playerStats, setPlayerStats] = useState({ level: 5, xp: 1200 });
  const [activeTab, setActiveTab] = useState("global");

  // Fetch active rooms
  const fetchRooms = async () => {
    try {
      setLoadingRooms(true);
      const res = await fetch("/api/rooms");
      const data = await res.json();
      setRooms(data.rooms || []);
    } catch (err) {
      console.error("Failed to fetch rooms", err);
    } finally {
      setLoadingRooms(false);
    }
  };

  // Fetch announcements
  const fetchAnnouncements = async () => {
    try {
      const res = await fetch("/api/announcements");
      const data = await res.json();
      setAnnouncements(data || []);
    } catch (err) {
      console.error("Announcements fetch failed:", err);
    }
  };

  // Socket listeners
  useEffect(() => {
    socket.on("announcement", (data) => {
      setAnnouncements((prev) => [data, ...prev.slice(0, 4)]);
    });

    socket.on("global-chat", (msg) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    fetchRooms();
    fetchAnnouncements();
    const interval = setInterval(fetchRooms, 8000);
    return () => clearInterval(interval);
  }, []);

  const sendMessage = () => {
    if (message.trim() !== "") {
      socket.emit("global-chat", { username, message });
      setMessage("");
    }
  };

  const handleCreateRoom = () => {
    if (!username) return alert("Enter a username first!");
    socket.emit("create-room", { username });
  };

  const handleJoinRoom = () => {
    if (!roomCode || !username) return alert("Enter username and room code!");
    socket.emit("join-room", { roomCode, username });
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 flex flex-col items-center justify-between text-white overflow-hidden relative">
      {/* Floating glow effect */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-3xl animate-pulse"></div>

      {/* HEADER */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center mt-10 mb-4"
      >
        <h1 className="text-5xl font-extrabold bg-gradient-to-r from-purple-400 via-indigo-300 to-blue-400 text-transparent bg-clip-text drop-shadow-md tracking-wide">
          Scribbly Royale
        </h1>
        <p className="text-indigo-300 mt-2 text-lg">Create, Join, and Compete — now with real-time global chat!</p>
      </motion.header>

      {/* CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 w-full max-w-7xl px-6 flex-grow">
        {/* Create / Join Card */}
        <motion.div variants={cardVariants} initial="hidden" animate="visible" className="lg:col-span-1 space-y-4">
          <Card className="bg-white/10 backdrop-blur-lg border border-white/20 shadow-lg rounded-2xl">
            <CardHeader>
              <h2 className="text-2xl font-semibold text-indigo-200">Join or Create Game</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Enter username..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-white/10 border-white/30 text-white"
              />
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Room code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  className="bg-white/10 border-white/30 text-white"
                />
                <Button onClick={handleJoinRoom} variant="default" className="bg-indigo-600 hover:bg-indigo-700">
                  <LogIn className="w-5 h-5 mr-1" /> Join
                </Button>
              </div>
              <Button onClick={handleCreateRoom} className="w-full bg-purple-600 hover:bg-purple-700">
                <PlusCircle className="w-5 h-5 mr-2" /> Create Room
              </Button>
            </CardContent>
          </Card>

          {/* Player Stats */}
          <Card className="bg-white/10 backdrop-blur-lg border border-white/20 shadow-lg">
            <CardHeader>
              <h3 className="text-xl font-semibold text-indigo-200">Your Stats</h3>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center text-indigo-100 mb-2">
                <span>Level:</span>
                <span>{playerStats.level}</span>
              </div>
              <div className="flex justify-between items-center text-indigo-100">
                <span>XP:</span>
                <span>{playerStats.xp}</span>
              </div>
              <Button className="mt-3 w-full bg-indigo-500 hover:bg-indigo-600">Customize Avatar</Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Active Games */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="lg:col-span-2 bg-white/5 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl flex flex-col"
        >
          <div className="flex justify-between items-center p-4 border-b border-white/20">
            <h2 className="text-2xl font-bold text-indigo-200 flex items-center gap-2">
              <Globe className="w-6 h-6" /> Active Games
            </h2>
            <Button variant="ghost" onClick={fetchRooms}>
              <RefreshCw className={`w-5 h-5 ${loadingRooms && "animate-spin"}`} />
            </Button>
          </div>
          <div className="overflow-y-auto flex-grow p-4">
            {rooms.length === 0 ? (
              <p className="text-indigo-300 text-center mt-8">No active games. Be the first to start one!</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {rooms.map((room, index) => (
                  <motion.div
                    key={index}
                    whileHover={{ scale: 1.02 }}
                    className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-white/20 p-4 rounded-xl shadow-md cursor-pointer transition-all"
                  >
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-bold text-indigo-100">Room {room.roomCode}</h3>
                      {room.gameStarted && <Crown className="text-yellow-400 w-5 h-5" />}
                    </div>
                    <p className="text-sm text-indigo-300 mt-1">
                      {room.playerCount} Players — {room.gameStarted ? "In Progress" : "Waiting"}
                    </p>
                    <Button
                      className="mt-3 w-full bg-indigo-600 hover:bg-indigo-700"
                      onClick={() => {
                        setRoomCode(room.roomCode);
                        handleJoinRoom();
                      }}
                    >
                      Join Game
                    </Button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Global Chat / Announcements */}
        <motion.div variants={cardVariants} initial="hidden" animate="visible" className="lg:col-span-1 space-y-4">
          <Card className="bg-white/10 backdrop-blur-lg border border-white/20 shadow-lg rounded-2xl">
            <CardHeader>
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-indigo-200 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" /> Global Chat
                </h3>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col h-72">
              <div className="flex-grow overflow-y-auto p-2 rounded-md bg-black/20 border border-white/10 mb-3">
                {chatMessages.map((msg, i) => (
                  <p key={i} className="text-sm mb-1">
                    <span className="text-indigo-300 font-semibold">{msg.username}: </span>
                    <span className="text-indigo-100">{msg.message}</span>
                  </p>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Type message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  className="bg-white/10 border-white/30 text-white"
                />
                <Button onClick={sendMessage} className="bg-indigo-600 hover:bg-indigo-700">
                  Send
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border border-white/20 shadow-lg rounded-2xl">
            <CardHeader>
              <h3 className="text-xl font-semibold text-indigo-200">Announcements</h3>
            </CardHeader>
            <CardContent className="h-40 overflow-y-auto space-y-2">
              {announcements.map((a, i) => (
                <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-indigo-100 text-sm">
                  🔔 {a.message}
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* FOOTER */}
      <footer className="w-full py-4 text-center text-indigo-300 text-sm">
         v1.0
      </footer>
    </div>
  );
}
