// src/pages/Game.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { initSocket } from "../utils/socket";

/**
 * FULL FEATURED Game page
 *
 * - Multi-tool drawing: brush, eraser, line, rect
 * - Emits 'draw' events to server (throttled)
 * - Receives remote draw events and renders them
 * - Shows word to drawer, hint to guessers
 * - Timer, rounds, start button (host only)
 * - Chat with fixed-height scrollbar
 * - Player list and host detection
 *
 * Notes:
 * - Server event names assumed from your backend: 'join-room', 'draw', 'clear-canvas',
 *   'chat-message', 'you-are-drawer', 'new-drawer', 'player-list', 'correct-guess',
 *   'gameStarted', 'startGame'
 *
 * - Drawing payload used: { type: 'stroke'|'line'|'rect'|'clear', color, size, points: [{x,y}, ...], x0,y0,x1,y1, tool }
 *   Server should relay it using socket.to(room).emit('draw', data)
 */

const TOOL_PEN = "pen";
const TOOL_ERASER = "eraser";
const TOOL_LINE = "line";
const TOOL_RECT = "rect";

function formatHint(word) {
  if (!word) return "";
  // reveal first letter, rest masked (preserve length)
  return word
    .split("")
    .map((ch, i) => (i === 0 ? ch : "_"))
    .join(" ");
}

export default function Game() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const username = location.state?.username || "Player";

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const socketRef = useRef(null);
  const rafRef = useRef(null);

  const [socket, setSocket] = useState(null);
  const [players, setPlayers] = useState([]); // [{ username, socketId, isDrawer }]
  const [isDrawer, setIsDrawer] = useState(false);
  const [drawerName, setDrawerName] = useState(null);
  const [word, setWord] = useState(""); // full word (only when drawer)
  const [wordHint, setWordHint] = useState("");
  const [timeLeft, setTimeLeft] = useState(80);
  const [round, setRound] = useState(1);
  const [totalRounds, setTotalRounds] = useState(3);
  const [messages, setMessages] = useState([]); // {username, message, system}
  const [guessInput, setGuessInput] = useState("");
  const [tool, setTool] = useState(TOOL_PEN);
  const [color, setColor] = useState("#000000");
  const [size, setSize] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasGuessed, setHasGuessed] = useState(false);
  const [hostName, setHostName] = useState(null);

  // Local drawing buffer for batching
  const strokeBufferRef = useRef([]);
  const lastEmitRef = useRef(0);

  // Responsive canvas sizing
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    // pick size based on container width, keep 4:3 ratio
    const width = Math.max(320, Math.floor(rect.width));
    const height = Math.max(240, Math.floor((width * 3) / 4));
    // preserve current drawing by copying
    const temp = document.createElement("canvas");
    temp.width = canvas.width;
    temp.height = canvas.height;
    const tctx = temp.getContext("2d");
    tctx.drawImage(canvas, 0, 0);
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    // white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // scale previous drawing to new size
    ctx.drawImage(temp, 0, 0, temp.width, temp.height, 0, 0, canvas.width, canvas.height);
  }, []);

  useEffect(() => {
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  // Helper to draw incoming data on canvas (both local and remote)
  const drawOnCanvas = useCallback((data, skipBegin = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (data.type === "clear") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    if (data.tool === TOOL_ERASER) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = data.color || "#000";
    }
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = data.size || 3;

    if (data.type === "stroke" && Array.isArray(data.points)) {
      ctx.beginPath();
      data.points.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
    }

    if (data.type === "line") {
      ctx.beginPath();
      ctx.moveTo(data.x0, data.y0);
      ctx.lineTo(data.x1, data.y1);
      ctx.stroke();
    }

    if (data.type === "rect") {
      const x = Math.min(data.x0, data.x1);
      const y = Math.min(data.y0, data.y1);
      const w = Math.abs(data.x1 - data.x0);
      const h = Math.abs(data.y1 - data.y0);
      if (data.tool === TOOL_ERASER) {
        ctx.clearRect(x, y, w, h);
      } else {
        ctx.strokeRect(x, y, w, h);
      }
    }

    // restore composite
    ctx.globalCompositeOperation = "source-over";
  }, []);

  // Socket setup
  useEffect(() => {
    const s = initSocket(); // using your helper to centralize URL / options
    socketRef.current = s;
    setSocket(s);

    s.on("connect", () => {
      console.log("[Game] socket connected", s.id);
      s.emit("join-room", { roomCode: roomId, username });
    });

    // Player list updates
    s.on("player-list", (playerList) => {
      // playerList is array of { username, socketId, isDrawer, isAdmin? }
      setPlayers(playerList);
      const host = playerList.length ? playerList[0].username : null;
      setHostName(host);
      // If this client is drawer (look up by socket id)
      const me = playerList.find((p) => p.socketId === s.id || p.username === username);
      if (me && me.isDrawer) {
        setIsDrawer(true);
      } else {
        setIsDrawer(false);
      }
    });

    // Drawer assignment
    s.on("you-are-drawer", ({ word: serverWord }) => {
      setIsDrawer(true);
      setWord(serverWord || "");
      setWordHint(formatHint(serverWord || ""));
      setMessages((m) => [...m, { system: true, message: `You are the drawer — word: ${serverWord}` }]);
      setHasGuessed(false);
    });

    s.on("new-drawer", ({ drawer: drawerName }) => {
      setIsDrawer(false);
      setDrawerName(drawerName);
      setWord("");
      setWordHint("");
      setMessages((m) => [...m, { system: true, message: `${drawerName} is drawing now.` }]);
      setHasGuessed(false);
    });

    // Game started
    s.on("gameStarted", () => {
      setMessages((m) => [...m, { system: true, message: "Game has started!" }]);
    });

    // Chat messages & guesses
    s.on("chat-message", (msg) => {
      // msg: { username, message, alreadyGuessed?, isDrawer? }
      setMessages((prev) => [...prev, { ...msg }]);
      // if someone else guessed correctly server emits correct-guess separately
    });

    s.on("correct-guess", ({ username: winner }) => {
      setMessages((prev) => [...prev, { system: true, message: `${winner} guessed correctly! 🎉` }]);
      // mark local user as guessed if winner matches
      if (winner === username) setHasGuessed(true);
    });

    // Receive draws from server
    s.on("draw", (data) => {
      // data should be the drawing payload
      drawOnCanvas(data);
    });

    // Clear canvas
    s.on("clear-canvas", () => {
      drawOnCanvas({ type: "clear" });
    });

    // join-success
    s.on("join-success", ({ roomCode, players }) => {
      setMessages((m) => [...m, { system: true, message: `Joined ${roomCode}` }]);
      setPlayers(players);
      const host = players.length ? players[0].username : null;
      setHostName(host);
    });

    s.on("error", (err) => {
      console.warn("[Game] server error", err);
      setMessages((m) => [...m, { system: true, message: `Error: ${err.message || err}` }]);
    });

    // cleanup
    return () => {
      try {
        s.disconnect();
      } catch (e) {}
      socketRef.current = null;
      setSocket(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, username, drawOnCanvas]);

  // Timer loop
  useEffect(() => {
    let interval = null;
    if (timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    } else if (timeLeft === 0) {
      // round ended
      setMessages((m) => [...m, { system: true, message: `Round ended. Word: ${word || "—"}` }]);
    }
    return () => clearInterval(interval);
  }, [timeLeft, word]);

  // Canvas pointer handlers & batching emits
  const pointerStateRef = useRef({
    lastPoints: [],
    drawingType: null,
    startX: 0,
    startY: 0,
  });

  // helper to convert client coords to canvas coords
  function clientToCanvas(e) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  }

  const flushStrokeBuffer = useCallback(() => {
    const s = socketRef.current;
    const now = Date.now();
    if (!s) return;
    if (strokeBufferRef.current.length === 0) return;
    // throttle: only emit once every 40ms (or if buffer > 50)
    if (now - lastEmitRef.current < 40 && strokeBufferRef.current.length < 50) return;
    const payload = {
      type: "stroke",
      tool,
      color: tool === TOOL_ERASER ? "#ffffff" : color,
      size,
      points: strokeBufferRef.current.splice(0, strokeBufferRef.current.length),
    };
    s.emit("draw", payload);
    lastEmitRef.current = now;
  }, [tool, color, size]);

  useEffect(() => {
    const tick = () => {
      flushStrokeBuffer();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [flushStrokeBuffer]);

  const handlePointerDown = (e) => {
    if (!isDrawer) return;
    e.preventDefault();
    const pos = clientToCanvas(e);
    pointerStateRef.current.startX = pos.x;
    pointerStateRef.current.startY = pos.y;
    pointerStateRef.current.lastPoints = [{ x: pos.x, y: pos.y }];
    pointerStateRef.current.drawingType = tool === TOOL_PEN || tool === TOOL_ERASER ? "stroke" : tool;
    setIsDrawing(true);
  };

  const handlePointerMove = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = clientToCanvas(e);
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (pointerStateRef.current.drawingType === "stroke") {
      // draw locally immediately
      const pt = { x: pos.x, y: pos.y };
      pointerStateRef.current.lastPoints.push(pt);
      // render immediate stroke chunk
      drawOnCanvas({
        type: "stroke",
        tool,
        color: tool === TOOL_ERASER ? "#ffffff" : color,
        size,
        points: [pointerStateRef.current.lastPoints[pointerStateRef.current.lastPoints.length - 2], pt],
      }, true);

      // append small chunk into buffer
      strokeBufferRef.current.push(pt);
      // flush will run on RAF / throttle
    } else if (pointerStateRef.current.drawingType === TOOL_LINE || pointerStateRef.current.drawingType === TOOL_RECT) {
      // for line/rect we show preview: redraw canvas snapshot + preview shape
      // A simple approach: restore last full canvas from DOM image and draw preview
      // To keep things simpler & robust we just redraw canvas snapshot: not optimal but okay
      // We'll store the current canvas image in dataURL once when pointerDown occurred.
      // Implement a lightweight preview: clear and re-render remote content not tracked here (skip)
      // Simpler: draw preview directly on canvas but we need a way to remove previous preview.
      // Implement preview by redrawing full canvas background (white) then drawing stored local image, then preview.
      // For performance and because remote drawings are applied to canvas directly, we will use a simpler local-only preview layer approach.
      // Keep preview: draw a temporary preview on a separate overlay canvas would be ideal - but to minimize extra elements, we'll do one-shot preview by saving initial snapshot once.
      const start = { x: pointerStateRef.current.startX, y: pointerStateRef.current.startY };
      // reload base snapshot from snapshotRef if available
      if (!pointerStateRef.current.snapshot) {
        const snap = document.createElement("canvas");
        snap.width = canvas.width;
        snap.height = canvas.height;
        snap.getContext("2d").drawImage(canvas, 0, 0);
        pointerStateRef.current.snapshot = snap;
      }
      const ctx = canvas.getContext("2d");
      // restore
      ctx.drawImage(pointerStateRef.current.snapshot, 0, 0);
      ctx.strokeStyle = tool === TOOL_ERASER ? "#ffffff" : color;
      ctx.lineWidth = size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (pointerStateRef.current.drawingType === TOOL_LINE) {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      } else {
        const x = Math.min(start.x, pos.x);
        const y = Math.min(start.y, pos.y);
        const w = Math.abs(pos.x - start.x);
        const h = Math.abs(pos.y - start.y);
        if (tool === TOOL_ERASER) {
          ctx.clearRect(x, y, w, h);
        } else {
          ctx.strokeRect(x, y, w, h);
        }
      }
    }
  };

  const handlePointerUp = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    const s = socketRef.current;
    const pos = clientToCanvas(e);

    const drawingType = pointerStateRef.current.drawingType;
    // finalize snap removed for stroke (strokeBuffer already received)
    if (drawingType === "stroke") {
      // flush current buffered points as one payload
      if (strokeBufferRef.current.length > 0) {
        const payload = {
          type: "stroke",
          tool,
          color: tool === TOOL_ERASER ? "#ffffff" : color,
          size,
          points: strokeBufferRef.current.splice(0, strokeBufferRef.current.length),
        };
        if (s) s.emit("draw", payload);
      }
    } else if (drawingType === TOOL_LINE || drawingType === TOOL_RECT) {
      const payload = {
        type: drawingType === TOOL_LINE ? "line" : "rect",
        tool,
        color: tool === TOOL_ERASER ? "#ffffff" : color,
        size,
        x0: pointerStateRef.current.startX,
        y0: pointerStateRef.current.startY,
        x1: pos.x,
        y1: pos.y,
      };
      // send to server & draw locally
      if (s) s.emit("draw", payload);
      drawOnCanvas(payload);
      // clear snapshot
      pointerStateRef.current.snapshot = null;
    }
    pointerStateRef.current.lastPoints = [];
    pointerStateRef.current.drawingType = null;
  };

  // Clear canvas action
  const handleClearCanvas = () => {
    const ctxClear = { type: "clear" };
    drawOnCanvas(ctxClear);
    const s = socketRef.current;
    if (s) s.emit("clear-canvas");
  };

  // Chat / guess actions
  const sendGuess = () => {
    if (!guessInput.trim()) return;
    const s = socketRef.current;
    // send chat-message to server; server will respond with correct-guess if matches
    if (s) s.emit("chat-message", { message: guessInput });
    setMessages((m) => [...m, { username, message: guessInput }]);
    setGuessInput("");
  };

  // Start game (host only)
  const startGame = () => {
    const s = socketRef.current;
    if (!s) return;
    s.emit("startGame");
  };

  // Helper to detect host: first non-admin player in players array
  const isHost = () => {
    if (!players || players.length === 0) return false;
    return players[0].username === username;
  };

  // Helper to format local time left bar percentage (uses default 80s)
  const timePercent = Math.max(0, Math.min(100, (timeLeft / 80) * 100));

  // small UI helpers: colors and sizes
  const palette = ["#000000", "#ffffff", "#ff3b30", "#32d74b", "#0a84ff", "#ffd60a", "#ff9f0a", "#ff2d55", "#6a0dad"];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-4 flex flex-col gap-4">
      <div className="mx-auto w-full max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 gap-4">
          <div>
            <h1 className="text-3xl font-bold">Room: {roomId}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-white/70">You: <strong>{username}</strong></span>
              <span className="text-sm text-white/70">• Round {round}/{totalRounds}</span>
              <span className={`text-sm font-medium ${isDrawer ? "text-amber-300" : "text-white/70"}`}>{isDrawer ? "You are drawing" : drawerName ? `${drawerName} is drawing` : "Waiting..."}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-56">
              <div className="text-xs text-white/60 mb-1">Timer</div>
              <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                <div style={{ width: `${timePercent}%` }} className="h-full bg-gradient-to-r from-green-400 to-red-400 transition-all" />
              </div>
              <div className="text-sm text-right mt-1">{timeLeft}s</div>
            </div>

            <Button onClick={() => navigate("/")} variant="secondary">Leave</Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-4">
          {/* Left: Players */}
          <div className="lg:col-span-1">
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-3">Players</h3>
              <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-2">
                {players.map((p, idx) => (
                  <div key={p.socketId || p.username} className={`flex items-center justify-between gap-2 p-2 rounded-md ${p.isDrawer ? "bg-gradient-to-r from-purple-700 to-pink-700/30 ring-1 ring-purple-500" : "bg-white/5"}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-400 flex items-center justify-center text-white font-bold">
                        {p.username?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <div className="font-semibold">{p.username}{idx === 0 ? " (host)" : ""}</div>
                        <div className="text-xs text-white/60">{p.isDrawer ? "Drawer" : "Guesser"}</div>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-white/80">{/* score placeholder */}0</div>
                  </div>
                ))}
                {players.length === 0 && <div className="text-sm text-white/60">No players yet</div>}
              </div>

              <div className="flex gap-2 mt-4">
                <Button onClick={() => handleClearCanvas()} variant="secondary" size="sm">Clear Canvas</Button>
                <Button onClick={() => startGame()} disabled={!isHost()} variant="primary" size="sm">Start</Button>
              </div>
            </Card>
          </div>

          {/* Middle: Canvas & Tools */}
          <div className="lg:col-span-2">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3 gap-2">
                <div className="flex items-center gap-2">
                  <div className="text-sm text-white/60">Tool:</div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setTool(TOOL_PEN)} className={`px-2 py-1 rounded ${tool === TOOL_PEN ? "bg-white/20" : "bg-white/5"}`}>Pen</button>
                    <button onClick={() => setTool(TOOL_ERASER)} className={`px-2 py-1 rounded ${tool === TOOL_ERASER ? "bg-white/20" : "bg-white/5"}`}>Eraser</button>
                    <button onClick={() => setTool(TOOL_LINE)} className={`px-2 py-1 rounded ${tool === TOOL_LINE ? "bg-white/20" : "bg-white/5"}`}>Line</button>
                    <button onClick={() => setTool(TOOL_RECT)} className={`px-2 py-1 rounded ${tool === TOOL_RECT ? "bg-white/20" : "bg-white/5"}`}>Rect</button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-sm text-white/60 mr-2">Brush</div>
                  <div className="flex items-center gap-1">
                    {palette.map((c) => (
                      <button key={c} onClick={() => setColor(c)} aria-label={c} className={`w-6 h-6 rounded ${color === c ? "ring-2 ring-white" : ""}`} style={{ background: c }} />
                    ))}
                  </div>
                  <div className="ml-3">
                    <select value={size} onChange={(e) => setSize(parseInt(e.target.value, 10))} className="rounded bg-white/5 px-2 py-1">
                      {[2,3,5,8,12,18,24].map(s => <option key={s} value={s}>{s}px</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div ref={containerRef} className="bg-white rounded-lg overflow-hidden relative touch-none">
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={600}
                  className={`w-full h-auto ${isDrawer ? "cursor-crosshair" : "cursor-not-allowed"}`}
                  onMouseDown={handlePointerDown}
                  onMouseMove={handlePointerMove}
                  onMouseUp={handlePointerUp}
                  onMouseLeave={handlePointerUp}
                  onTouchStart={handlePointerDown}
                  onTouchMove={handlePointerMove}
                  onTouchEnd={handlePointerUp}
                />
                {!isDrawer && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-black/40 text-white/80 px-4 py-2 rounded-md backdrop-blur-sm text-center">
                      {drawerName ? `${drawerName} is drawing...` : "Waiting for drawer..."}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="text-sm text-white/60">Word: {isDrawer ? (<strong className="text-white">{word}</strong>) : (<span className="tracking-widest">{wordHint}</span>)}</div>
                <div className="text-sm text-white/60">Round {round}/{totalRounds}</div>
              </div>
            </Card>
          </div>

          {/* Right: Chat */}
          <div className="lg:col-span-1">
            <Card className="p-4 flex flex-col h-full">
              <h3 className="text-lg font-semibold mb-3">Chat & Guesses</h3>
              <div className="flex-1 overflow-y-auto mb-3 space-y-2 max-h-[60vh]">
                {messages.length === 0 && <div className="text-center text-white/50 py-8">No messages yet</div>}
                {messages.map((m, idx) => (
                  <div key={idx} className={`p-2 rounded ${m.system ? "bg-blue-500/10 text-blue-300 italic text-sm" : m.username === username ? "bg-purple-600/20 ml-auto max-w-[90%]" : "bg-white/5"}`}>
                    {!m.system && <div className="text-xs text-white/60 mb-1">{m.username}</div>}
                    <div>{m.message}</div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  value={guessInput}
                  onChange={(e) => setGuessInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") sendGuess(); }}
                  disabled={isDrawer || hasGuessed}
                  placeholder={isDrawer ? "You are drawing..." : (hasGuessed ? "You already guessed" : "Type guess...")}
                  className="flex-1 px-3 py-2 rounded bg-white/5 outline-none"
                />
                <Button onClick={sendGuess} disabled={isDrawer || hasGuessed}>Send</Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
