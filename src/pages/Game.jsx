// src/pages/Game.jsx
import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { useParams, useLocation } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { initSocket } from "../utils/socket";

// Canvas wrapper to expose drawing methods to parent
const CanvasWrapper = forwardRef(({ socket, isDrawer, roomId }, ref) => {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawing = useRef(false);
  const path = useRef([]);

  useImperativeHandle(ref, () => ({
    drawFromData: (data) => {
      if (!ctxRef.current) return;
      data.forEach(({ x, y, type }) => {
        if (type === "begin") ctxRef.current.beginPath();
        if (type === "line") ctxRef.current.lineTo(x, y);
        if (type === "end") ctxRef.current.stroke();
      });
    },
    clear: () => ctxRef.current && ctxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height),
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 3;
    ctxRef.current = ctx;

    const handleResize = () => {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      ctx.putImageData(imageData, 0, 0);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!socket || !isDrawer) return;

    const emitDraw = () => {
      socket.emit("drawing-data", { path: path.current, roomId });
    };

    const canvas = canvasRef.current;

    const start = (e) => {
      drawing.current = true;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      path.current.push({ x, y, type: "begin" });
    };
    const draw = (e) => {
      if (!drawing.current) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      path.current.push({ x, y, type: "line" });
      ctxRef.current.lineTo(x, y);
      ctxRef.current.stroke();
      emitDraw();
    };
    const end = () => {
      drawing.current = false;
      path.current.push({ type: "end" });
      emitDraw();
      path.current = [];
    };

    canvas.addEventListener("mousedown", start);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", end);
    canvas.addEventListener("mouseleave", end);

    return () => {
      canvas.removeEventListener("mousedown", start);
      canvas.removeEventListener("mousemove", draw);
      canvas.removeEventListener("mouseup", end);
      canvas.removeEventListener("mouseleave", end);
    };
  }, [socket, isDrawer, roomId]);

  return <canvas ref={canvasRef} className="w-full h-96 md:h-[500px] border rounded shadow-md bg-white" />;
});

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
  const [timeLeft, setTimeLeft] = useState(60);
  const [round, setRound] = useState(1);
  const [maxRounds, setMaxRounds] = useState(5);
  const [scores, setScores] = useState({});
  const [hints, setHints] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);

  const chatRef = useRef();
  const canvasRef = useRef();

  const isDrawer = drawer === username;

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const s = initSocket();
    setSocket(s);

    s.emit("join-room", { roomCode: roomId, username });

    s.on("player-list", (list) => setPlayers(list));

    s.on("you-are-drawer", ({ word }) => {
      setDrawer(username);
      setCurrentWord(word);
      setHints(generateHints(word));
      startTimer();
    });

    s.on("new-drawer", ({ drawer: drawerName }) => {
      setDrawer(drawerName);
      setCurrentWord(""); // Only drawer sees word
      setHints([]);
      startTimer();
    });

    s.on("chat-message", (msg) => setMessages((prev) => [...prev, msg]));

    s.on("correct-guess", ({ username: winner }) => {
      setMessages((prev) => [...prev, { system: true, text: `${winner} guessed the word! 🎉` }]);
      setScores((prev) => ({ ...prev, [winner]: (prev[winner] || 0) + 10 }));
    });

    s.on("round-update", ({ roundNumber, totalRounds }) => {
      setRound(roundNumber);
      setMaxRounds(totalRounds);
      setTimeLeft(60);
      setCurrentWord("");
      setHints([]);
      if (canvasRef.current) canvasRef.current.clear();
    });

    s.on("drawing-data", (data) => {
      if (!isDrawer && canvasRef.current) canvasRef.current.drawFromData(data.path);
    });

    setGameStarted(true);

    return () => s.disconnect();
  }, []);

  const startTimer = () => setTimeLeft(60);

  const generateHints = (word) => {
    return word.split("").map((l) => "_");
  };

  const sendMessage = () => {
    if (!chatInput.trim() || !socket) return;
    const trimmed = chatInput.trim();

    // Guess logic
    if (!isDrawer && currentWord && trimmed.toLowerCase() === currentWord.toLowerCase()) {
      socket.emit("correct-guess", { username, roomCode: roomId });
      setMessages((prev) => [...prev, { system: true, text: `${username} guessed the word! 🎉` }]);
      setScores((prev) => ({ ...prev, [username]: (prev[username] || 0) + 10 }));
    } else {
      socket.emit("chat-message", { message: trimmed });
      setMessages((prev) => [...prev, { username, message: trimmed }]);
    }
    setChatInput("");
  };

  return (
    <div className="flex flex-col items-center w-full gap-4 p-2 md:p-4 max-w-6xl">
      {/* Header */}
      <h2 className="text-3xl font-display text-purple text-center">
        Room: {roomId} | Round {round}/{maxRounds}
      </h2>

      {/* Timer */}
      <div className="w-full h-4 bg-gray-200 rounded overflow-hidden">
        <div
          className={`h-4 rounded transition-all duration-500 ${timeLeft < 10 ? "bg-red-500" : "bg-green-400"}`}
          style={{ width: `${(timeLeft / 60) * 100}%` }}
        />
      </div>

      {/* Main Content */}
      <div className="flex flex-col md:flex-row w-full gap-4">
        {/* Canvas */}
        <div className="flex-1">
          <CanvasWrapper ref={canvasRef} socket={socket} isDrawer={isDrawer} roomId={roomId} />
          {isDrawer && currentWord && (
            <Card className="mt-2 p-2 text-center bg-yellow-100 font-bold">
              🎨 Draw this: <span className="underline">{currentWord}</span>
            </Card>
          )}
          {!isDrawer && hints.length > 0 && (
            <Card className="mt-2 p-2 text-center bg-blue-100 font-bold">
              Word: {hints.join(" ")}
            </Card>
          )}
        </div>

        {/* Sidebar: Players + Chat */}
        <div className="flex flex-col w-full md:w-1/3 gap-2">
          {/* Players */}
          <Card className="flex flex-col gap-1 p-2">
            <h3 className="font-bold text-lg">Players & Scores</h3>
            <ul>
              {players.map((p) => (
                <li key={p.socketId} className={`flex justify-between p-1 rounded ${p.isDrawer ? "bg-yellow font-bold" : "bg-blue-100"}`}>
                  <span>{p.username}</span>
                  <span>{scores[p.username] || 0} pts</span>
                  {p.isDrawer && <span>🎨</span>}
                </li>
              ))}
            </ul>
          </Card>

          {/* Chat */}
          <Card className="flex flex-col p-2">
            <h3 className="font-bold text-lg">Chat</h3>
            <ul ref={chatRef} className="flex flex-col gap-1 p-2 border rounded h-60 overflow-y-auto bg-gray-50">
              {messages.map((m, i) => (
                <li key={i} className={`${m.system ? "italic text-gray-500" : m.username === username ? "text-right text-purple-600 font-semibold" : ""}`}>
                  {m.system ? m.text : `${m.username}: ${m.message}`}
                </li>
              ))}
            </ul>
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message or guess..."
                className="flex-1 p-2 border rounded"
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
