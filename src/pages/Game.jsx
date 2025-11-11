import React, { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { initSocket } from "../utils/socket";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

// Canvas drawing component
function Canvas({ socket, isDrawer, width, height }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctx.lineWidth = 4;
    ctxRef.current = ctx;

    // Listen for remote drawing
    socket.on("drawing", ({ x0, y0, x1, y1, color }) => {
      ctx.strokeStyle = color || "black";
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      ctx.closePath();
    });

    // Clear canvas on round reset
    socket.on("clear-canvas", () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    return () => {
      socket.off("drawing");
      socket.off("clear-canvas");
    };
  }, [socket, width, height]);

  const handleMouseDown = (e) => {
    if (!isDrawer) return;
    drawing.current = true;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    socket._lastPos = { x, y };
  };

  const handleMouseMove = (e) => {
    if (!isDrawer || !drawing.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const { x: x0, y: y0 } = socket._lastPos || { x, y };

    // Emit drawing
    socket.emit("drawing", { x0, y0, x1: x, y1: y, color: "black" });

    // Local draw
    const ctx = ctxRef.current;
    ctx.strokeStyle = "black";
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.closePath();

    socket._lastPos = { x, y };
  };

  const handleMouseUp = () => {
    drawing.current = false;
    socket._lastPos = null;
  };

  const handleTouchStart = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY });
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    handleMouseUp();
  };

  return (
    <canvas
      ref={canvasRef}
      className="border rounded w-full md:w-[600px] h-[400px] touch-none md:touch-auto"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    />
  );
}

export default function Game() {
  const { roomId } = useParams();
  const location = useLocation();
  const username = location.state?.username || "Player";

  const [socket, setSocket] = useState(null);
  const [players, setPlayers] = useState([]);
  const [drawer, setDrawer] = useState(null);
  const [word, setWord] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [round, setRound] = useState(1);
  const [scoreboard, setScoreboard] = useState([]);
  const [announcement, setAnnouncement] = useState("");

  const chatEndRef = useRef(null);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const s = initSocket();
    setSocket(s);

    // Join room
    s.emit("join-room", { roomCode: roomId, username });

    // Player updates
    s.on("player-list", (list) => {
      setPlayers(list);
      setScoreboard(list.map(p => ({ username: p.username, score: p.score || 0 })));
      const currentDrawer = list.find(p => p.isDrawer);
      setDrawer(currentDrawer?.username || null);
    });

    // Chat
    s.on("chat-message", (msg) => setMessages(prev => [...prev, msg]));
    s.on("announcement", (msg) => setAnnouncement(msg));

    // Drawer updates
    s.on("you-are-drawer", ({ word }) => {
      setDrawer(username);
      setWord(word);
      s.emit("clear-canvas");
    });
    s.on("new-drawer", ({ drawer: drawerName }) => {
      setDrawer(drawerName);
      setWord("");
      s.emit("clear-canvas");
    });

    // Correct guesses
    s.on("correct-guess", ({ username: winner, word: correctWord }) => {
      setMessages(prev => [...prev, { system: true, text: `${winner} guessed the word! (${correctWord}) 🎉` }]);
    });

    // Game start / new round
    s.on("gameStarted", ({ roundLength }) => {
      setTimeLeft(roundLength || 90);
      setRound(1);
    });
    s.on("round-update", ({ roundNum, roundLength }) => {
      setRound(roundNum);
      setTimeLeft(roundLength);
    });

    // Timer tick from server
    s.on("timer", ({ timeLeft }) => setTimeLeft(timeLeft));

    return () => s.disconnect();
  }, [roomId, username]);

  const sendMessage = () => {
    if (!chatInput.trim() || !socket) return;
    socket.emit("chat-message", { message: chatInput });
    setChatInput("");
  };

  const guessWord = (wordGuess) => {
    if (!wordGuess.trim() || !socket) return;
    socket.emit("guess-word", { guess: wordGuess });
    setChatInput("");
  };

  const isDrawer = drawer === username;
  const isAdmin = players.find(p => p.username === username)?.isAdmin;

  return (
    <div className="flex flex-col items-center w-full p-4 gap-4 max-w-6xl">
      <h2 className="text-3xl font-display text-purple text-center">Room: {roomId}</h2>
      <Card className="w-full flex flex-col md:flex-row gap-4 p-4">
        {/* Left: Canvas */}
        <div className="flex-1 flex flex-col items-center gap-2">
          <Canvas socket={socket} isDrawer={isDrawer} width={600} height={400} />
          {isDrawer && <p className="text-lg font-bold text-pink mt-2">You are drawing: <span className="underline">{word}</span></p>}
          {!isDrawer && <p className="text-lg font-bold text-blue mt-2">{drawer || "Waiting for drawer"} is drawing...</p>}
          <p className="text-gray-600 mt-1">Round: {round} | Time Left: {timeLeft}s</p>
        </div>

        {/* Right: Players + Chat */}
        <div className="flex-1 flex flex-col gap-2">
          <Card className="flex flex-col gap-2">
            <h3 className="text-lg font-bold">Players</h3>
            <ul className="flex flex-col gap-1">
              {players.map(p => (
                <li key={p.socketId} className={`p-1 rounded ${p.isDrawer ? "bg-yellow font-bold" : "bg-gray-100"}`}>
                  {p.username} {p.isDrawer ? "🎨" : ""} {p.isAdmin ? "(ADMIN)" : ""} — Score: {p.score || 0}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="flex flex-col gap-2 h-[300px] overflow-hidden">
            <h3 className="text-lg font-bold">Chat {announcement && <span className="text-red-500">— {announcement}</span>}</h3>
            <div className="flex-1 overflow-y-auto p-2 border rounded flex flex-col gap-1 bg-white">
              {messages.map((m,i) => (
                <div key={i} className={m.system ? "italic text-gray-500" : ""}>
                  {m.system ? m.text : `${m.username}: ${m.message}`}
                </div>
              ))}
              <div ref={chatEndRef}></div>
            </div>
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={isDrawer ? "Guess a word..." : "Type a message..."}
                className="flex-1 p-2 border rounded"
                onKeyDown={(e) => {
                  if(e.key==="Enter") isDrawer ? guessWord(chatInput) : sendMessage();
                }}
              />
              <Button onClick={() => isDrawer ? guessWord(chatInput) : sendMessage()}>Send</Button>
            </div>
          </Card>
        </div>
      </Card>

      {/* Global admin controls */}
      {isAdmin && (
        <Card className="w-full p-4 mt-4">
          <h3 className="text-lg font-bold">Admin Controls</h3>
          <div className="flex flex-col md:flex-row gap-2 mt-2">
            <Button onClick={() => socket.emit("admin-clear-room")}>Clear Room</Button>
            <Button onClick={() => socket.emit("admin-restart-round")}>Restart Round</Button>
            <input
              type="text"
              placeholder="Global Announcement"
              className="flex-1 p-2 border rounded"
              onKeyDown={(e) => {if(e.key==="Enter") socket.emit("admin-announcement",{message:e.target.value})}}
            />
            <Button onClick={() => socket.emit("admin-announcement",{message:announcement})}>Send</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
