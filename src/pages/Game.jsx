// src/pages/Game.jsx
import React, { useEffect, useState, useRef } from "react";
import { useLocation, useParams } from "react-router-dom";
import Canvas from "../components/Canvas";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { initSocket } from "../utils/socket";

export default function Game() {
  const { roomId } = useParams();
  const location = useLocation();
  const username = location.state?.username || "Player";

  const [socket, setSocket] = useState(null);
  const [players, setPlayers] = useState([]);
  const [drawer, setDrawer] = useState(null);
  const [currentWord, setCurrentWord] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [timeLeft, setTimeLeft] = useState(60); // seconds per round
  const [round, setRound] = useState(1);
  const [maxRounds, setMaxRounds] = useState(5);

  const chatRef = useRef();

  const isDrawer = drawer === username;

  // Auto scroll chat
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const s = initSocket();
    setSocket(s);

    s.emit("join-room", { roomCode: roomId, username });

    // Player list
    s.on("player-list", (list) => setPlayers(list));

    // Drawer selection
    s.on("you-are-drawer", ({ word }) => {
      setDrawer(username);
      setCurrentWord(word);
      startTimer();
    });

    s.on("new-drawer", ({ drawer: drawerName }) => {
      setDrawer(drawerName);
      setCurrentWord(""); // Only drawer sees the word
      startTimer();
    });

    // Chat & guesses
    s.on("chat-message", (msg) => setMessages((prev) => [...prev, msg]));
    s.on("correct-guess", ({ username: winner }) =>
      setMessages((prev) => [
        ...prev,
        { system: true, text: `${winner} guessed the word! 🎉` },
      ])
    );

    // New round / game start
    s.on("gameStarted", () => setRound(1));
    s.on("round-update", ({ roundNumber, totalRounds }) => {
      setRound(roundNumber);
      setMaxRounds(totalRounds);
      setTimeLeft(60);
    });

    // Drawing data
    s.on("drawing-data", (data) => {
      if (!isDrawer && canvasRef.current) {
        canvasRef.current.drawFromData(data);
      }
    });

    return () => s.disconnect();
  }, []);

  // Timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  // Canvas ref
  const canvasRef = useRef();

  const sendMessage = () => {
    if (!chatInput.trim() || !socket) return;

    const trimmed = chatInput.trim();
    socket.emit("chat-message", { message: trimmed });

    // If guess is correct, notify server
    if (!isDrawer && trimmed.toLowerCase() === currentWord?.toLowerCase()) {
      socket.emit("correct-guess", { username, roomCode: roomId });
      setMessages((prev) => [
        ...prev,
        { system: true, text: `${username} guessed the word! 🎉` },
      ]);
    }

    setChatInput("");
  };

  const startTimer = () => setTimeLeft(60);

  return (
    <div className="flex flex-col items-center w-full p-2 md:p-4 gap-4 max-w-6xl">
      {/* Header */}
      <h2 className="text-3xl font-display text-purple text-center">
        Room: {roomId} | Round {round}/{maxRounds}
      </h2>

      {/* Timer bar */}
      <div className="w-full bg-gray-200 h-4 rounded overflow-hidden mb-2">
        <div
          className={`h-4 rounded transition-all duration-500 ${
            timeLeft < 10 ? "bg-red-500" : "bg-green-400"
          }`}
          style={{ width: `${(timeLeft / 60) * 100}%` }}
        ></div>
      </div>

      {/* Main content */}
      <div className="flex flex-col md:flex-row w-full gap-4">
        {/* Left: Canvas */}
        <div className="flex-1">
          <Canvas
            ref={canvasRef}
            socket={socket}
            isDrawer={isDrawer}
            roomId={roomId}
          />
          {isDrawer && currentWord && (
            <Card className="mt-2 p-2 text-center bg-yellow-100 font-bold">
              🎨 Draw this: <span className="underline">{currentWord}</span>
            </Card>
          )}
        </div>

        {/* Right: Chat + players */}
        <div className="flex flex-col w-full md:w-1/3 gap-2">
          {/* Player list */}
          <Card className="p-2 flex flex-col gap-1">
            <h3 className="font-bold text-lg">Players</h3>
            <ul>
              {players.map((p) => (
                <li
                  key={p.socketId}
                  className={`flex justify-between p-1 rounded ${
                    p.isDrawer ? "bg-yellow font-bold" : "bg-blue-100"
                  }`}
                >
                  <span>{p.username}</span>
                  {p.isDrawer && <span>🎨</span>}
                </li>
              ))}
            </ul>
          </Card>

          {/* Chat */}
          <Card className="flex flex-col p-2">
            <h3 className="font-bold text-lg">Chat</h3>
            <ul
              ref={chatRef}
              className="flex flex-col gap-1 p-2 border rounded h-60 overflow-y-auto bg-gray-50"
            >
              {messages.map((m, i) => (
                <li
                  key={i}
                  className={`${
                    m.system
                      ? "italic text-gray-500"
                      : m.username === username
                      ? "text-right text-purple-600 font-semibold"
                      : ""
                  }`}
                >
                  {m.system ? m.text : `${m.username}: ${m.message}`}
                </li>
              ))}
            </ul>
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 p-2 border rounded"
                placeholder="Type a message or guess..."
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />
              <Button onClick={sendMessage}>Send</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
