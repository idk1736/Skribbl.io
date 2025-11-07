import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { motion } from "framer-motion";

export default function Home() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [roomType, setRoomType] = useState("public"); // 'public' or 'private'
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [storedName, setStoredName] = useState("");

  useEffect(() => {
    const savedName = localStorage.getItem("username");
    if (savedName) {
      setStoredName(savedName);
      setUsername(savedName);
    }
  }, []);

  const generateRoomId = () =>
    Math.random().toString(36).substring(2, 8).toUpperCase();

  const createRoom = () => {
    if (!username.trim()) {
      setError("Please enter a name before creating a room.");
      return;
    }
    localStorage.setItem("username", username);

    const newRoomId = generateRoomId();
    navigate(`/lobby/${newRoomId}`, {
      state: {
        username,
        password: roomType === "private" ? password : null,
        isPrivate: roomType === "private",
      },
    });
  };

  const joinRoom = () => {
    if (!username.trim() || !roomId.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    localStorage.setItem("username", username);

    navigate(`/lobby/${roomId}`, {
      state: {
        username,
        password: roomType === "private" ? password : null,
        isPrivate: roomType === "private",
      },
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (roomId.trim()) joinRoom();
      else createRoom();
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-tr from-purple-100 via-pink-50 to-blue-100 relative overflow-hidden">
      {/* background gradient shapes */}
      <div className="absolute w-[400px] h-[400px] bg-pink-200 rounded-full blur-3xl opacity-30 -top-20 -left-32 animate-pulse"></div>
      <div className="absolute w-[500px] h-[500px] bg-purple-300 rounded-full blur-3xl opacity-30 -bottom-32 -right-40 animate-pulse"></div>

      <motion.h1
        className="text-5xl md:text-6xl font-display text-purple-800 z-10 mb-10 text-center drop-shadow-lg"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        🎨 Skribbl Clone
      </motion.h1>

      <Card className="z-10 w-full max-w-md flex flex-col gap-6 p-6 shadow-2xl border border-purple-100 bg-white/80 backdrop-blur-md rounded-2xl">
        <motion.div
          className="flex flex-col gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <label className="text-sm font-semibold text-gray-600">
            Username
          </label>
          <Input
            placeholder="Enter your name"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError("");
            }}
            onKeyDown={handleKeyDown}
            maxLength={20}
            className="focus:ring-2 focus:ring-purple-300"
          />
        </motion.div>

        <motion.div
          className="flex flex-col gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <label className="text-sm font-semibold text-gray-600">
            Room Type
          </label>
          <div className="flex gap-3">
            <Button
              onClick={() => setRoomType("public")}
              className={`flex-1 py-2 rounded-xl font-semibold transition ${
                roomType === "public"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              🌍 Public
            </Button>
            <Button
              onClick={() => setRoomType("private")}
              className={`flex-1 py-2 rounded-xl font-semibold transition ${
                roomType === "private"
                  ? "bg-pink-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              🔒 Private
            </Button>
          </div>
        </motion.div>

        {roomType === "private" && (
          <motion.div
            className="flex flex-col gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <label className="text-sm font-semibold text-gray-600">
              Room Password
            </label>
            <Input
              placeholder="Enter password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              onKeyDown={handleKeyDown}
              className="focus:ring-2 focus:ring-pink-300"
            />
          </motion.div>
        )}

        <motion.div
          className="flex flex-col gap-4 mt-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            onClick={createRoom}
            disabled={!username}
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 rounded-xl font-semibold hover:shadow-lg transition"
          >
            ➕ Create New Room
          </Button>

          <div className="flex gap-2 items-center">
            <Input
              placeholder="Enter Room ID (optional)"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />
            <Button
              onClick={joinRoom}
              disabled={!username || !roomId}
              className="bg-green-500 hover:bg-green-600 text-white px-6 rounded-xl font-semibold"
            >
              Join
            </Button>
          </div>
        </motion.div>

        {error && (
          <motion.p
            className="text-red-500 text-sm font-medium text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {error}
          </motion.p>
        )}
      </Card>

      <motion.p
        className="text-center text-gray-700 mt-8 text-sm z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        Play with friends in your browser — no downloads, no signup.
        <br />
        Create a <span className="text-blue-500 font-semibold">Public</span> room
        or protect it with a{" "}
        <span className="text-pink-500 font-semibold">Password</span>.
      </motion.p>
    </div>
  );
}
