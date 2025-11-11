// src/pages/Game.jsx
import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { initSocket } from "../utils/socket";

/**
 * Robust Game page:
 * - Listens for multiple event name variants used across your backend iterations
 * - Emits the canonical events your server expects (join-room, draw, chat-message, startGame, correct-guess)
 * - Mobile-friendly canvas with touch support
 * - Client-side timer fallback (starts when drawer / round start events arrive)
 * - Chat & guess handling, player list, scores, drawer highlight
 */

export default function Game() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const username = (location.state?.username || "Player").trim();

  const [socket, setSocket] = useState(null);

  const [players, setPlayers] = useState([]); // array of { username, socketId, isDrawer, score? }
  const [drawer, setDrawer] = useState(null); // username of current drawer
  const [word, setWord] = useState(""); // revealed only to drawer
  const [maskedWord, setMaskedWord] = useState(""); // shown to guessers
  const [messages, setMessages] = useState([]); // chat and system messages
  const [chatInput, setChatInput] = useState("");
  const [timer, setTimer] = useState(0);
  const [round, setRound] = useState(1);
  const [isGameActive, setIsGameActive] = useState(false);
  const [scores, setScores] = useState({}); // { username: score }

  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  // helper: ensure numeric timer tick every second
  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, [timer]);

  // initialize socket and socket listeners
  useEffect(() => {
    const s = initSocket();
    setSocket(s);

    // emit join event - backend expects 'join-room' sometimes 'joinRoom'
    s.emit("join-room", { roomCode: roomId, username });
    s.emit("joinRoom", { roomId, username });

    // Player list update - handle 'player-list' or 'updatePlayers'
    s.on("player-list", (playerList) => {
      // unify shape: if server sends array of strings or array of objects
      const normalized = playerList.map((p) =>
        typeof p === "string" ? { username: p, socketId: null, isDrawer: false } : p
      );
      setPlayers(normalized);
      // sync scores map
      const newScores = { ...scores };
      normalized.forEach((p) => {
        if (p.username && newScores[p.username] == null) newScores[p.username] = p.score ?? 0;
      });
      setScores(newScores);
    });
    s.on("updatePlayers", (p) => {
      // also accept 'updatePlayers' (older samples had this)
      s.emit("request-player-list");
      if (Array.isArray(p)) {
        const normalized = p.map((obj) => (typeof obj === "string" ? { username: obj } : obj));
        setPlayers(normalized);
      }
    });

    // Drawer assignment: server uses 'you-are-drawer' or 'set-drawer' / 'new-drawer'
    s.on("you-are-drawer", (payload) => {
      // payload may include { word }
      setDrawer(username);
      if (payload?.word) {
        setWord(payload.word);
        setMaskedWord(""); // drawer sees the word
      }
      // start client timer fallback
      if (payload?.time) setTimer(payload.time);
      else setTimer(60);
      setIsGameActive(true);
    });

    s.on("set-drawer", (payload) => {
      // payload: { drawer, word?, round?, time? }
      const drawerName = payload?.drawer ?? payload;
      setDrawer(drawerName);
      if (drawerName === username) {
        // if server gave word, accept it, else empty (server should provide)
        if (payload.word) {
          setWord(payload.word);
          setMaskedWord("");
        } else {
          setWord("");
          setMaskedWord("");
        }
      } else {
        // guesser view: mask word if provided
        if (payload.word) {
          setWord("");
          setMaskedWord("_ ".repeat(payload.word.length));
        } else {
          setWord("");
          setMaskedWord("");
        }
      }
      if (payload.round) setRound(payload.round);
      if (payload.time) setTimer(payload.time);
      else setTimer(60);
      setIsGameActive(true);
    });

    s.on("new-drawer", (payload) => {
      // payload may be { drawer } or string
      const drawerName = payload?.drawer ?? payload;
      setDrawer(drawerName);
      setWord("");
      setMaskedWord("");
      setTimer(60);
      setIsGameActive(true);
    });

    // Round start / round-start (some variants)
    s.on("round-start", (payload) => {
      // payload expected: { word, drawer, round, time }
      const { word: w, drawer: d, round: r, time } = payload || {};
      if (d) setDrawer(d);
      if (r) setRound(r);
      if (d === username && w) {
        setWord(w);
        setMaskedWord("");
      } else if (w) {
        setWord("");
        setMaskedWord("_ ".repeat(w.length));
      } else {
        setWord("");
        setMaskedWord("");
      }
      setTimer(time ?? 60);
      setIsGameActive(true);
      clearCanvas();
    });

    // Some servers emit 'gameStarted' or 'game-started'
    s.on("gameStarted", (payload) => {
      // move into active game view; server may also send initial round state
      if (payload?.round) setRound(payload.round);
      setIsGameActive(true);
    });
    s.on("game-started", (payload) => {
      if (payload?.round) setRound(payload.round);
      setIsGameActive(true);
    });

    // Drawing data from server could be 'draw', 'draw-data', 'drawing', 'draw-data'
    const handleRemoteDraw = (data) => {
      // data may contain { x0, y0, x1, y1 } OR { x, y }
      if (!data) return;
      const ctx = ctxRef.current;
      if (!ctx) return;
      ctx.beginPath();
      if (data.x0 != null && data.y0 != null && data.x1 != null && data.y1 != null) {
        ctx.moveTo(data.x0, data.y0);
        ctx.lineTo(data.x1, data.y1);
        ctx.stroke();
      } else if (data.x != null && data.y != null) {
        // draw short line to that point using lastPosRef if present
        const last = lastPosRef.current || { x: data.x, y: data.y };
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(data.x, data.y);
        ctx.stroke();
        lastPosRef.current = { x: data.x, y: data.y };
      }
    };

    s.on("draw", handleRemoteDraw);
    s.on("draw-data", handleRemoteDraw);
    s.on("drawing", handleRemoteDraw);

    // Chat & guesses
    s.on("chat-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });
    s.on("chatMessage", (msg) => setMessages((prev) => [...prev, msg])); // alternate
    s.on("correct-guess", (payload) => {
      // payload may be { username } or string
      const winner = payload?.username ?? payload;
      setMessages((prev) => [...prev, { system: true, text: `${winner} guessed correctly! 🎉` }]);
      // update guessed player's score if provided by server in payload
      if (payload?.scores) setScores(payload.scores);
    });

    // Round end events: 'round-end', 'roundEnded', 'round-ended'
    s.on("round-end", (payload) => {
      setMessages((prev) => [...prev, { system: true, text: `Round ended. Word was: ${payload?.word ?? "N/A"}` }]);
      setTimer(0);
    });
    s.on("roundEnded", (payload) => {
      setMessages((prev) => [...prev, { system: true, text: `Round ended. Word was: ${payload?.word ?? "N/A"}` }]);
      setTimer(0);
    });

    // Scores update (server might emit)
    s.on("scores", (payload) => {
      if (typeof payload === "object") setScores(payload);
    });

    // server error messages
    s.on("error", (err) => {
      setMessages((prev) => [...prev, { system: true, text: "[server error] " + (err?.message ?? err) }]);
    });

    // clean up
    return () => {
      try {
        s.off("player-list");
        s.off("updatePlayers");
        s.off("you-are-drawer");
        s.off("set-drawer");
        s.off("new-drawer");
        s.off("round-start");
        s.off("gameStarted");
        s.off("game-started");
        s.off("draw");
        s.off("draw-data");
        s.off("drawing");
        s.off("chat-message");
        s.off("chatMessage");
        s.off("correct-guess");
        s.off("round-end");
        s.off("roundEnded");
        s.off("scores");
        s.disconnect();
      } catch (e) {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  // Canvas setup (responsive). Run after first render.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // set canvas pixel size according to displayed size for crisp rendering
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(rect.width * ratio);
      canvas.height = Math.floor(rect.height * ratio);
      canvas.style.width = `${Math.floor(rect.width)}px`;
      canvas.style.height = `${Math.floor(rect.height)}px`;
      const ctx = canvas.getContext("2d");
      ctx.scale(ratio, ratio);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#111827"; // near-black
      ctxRef.current = ctx;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  // Drawing helpers (mouse + touch)
  const getPointerPos = (ev, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const ratio = 1; // we've already scaled canvas by devicePixelRatio
    if (ev.touches && ev.touches[0]) {
      return {
        x: (ev.touches[0].clientX - rect.left) * ratio,
        y: (ev.touches[0].clientY - rect.top) * ratio,
      };
    } else {
      return {
        x: (ev.nativeEvent?.offsetX ?? ev.clientX - rect.left) * ratio,
        y: (ev.nativeEvent?.offsetY ?? ev.clientY - rect.top) * ratio,
      };
    }
  };

  const startDrawing = (ev) => {
    if (!isDrawer) return;
    const canvas = canvasRef.current;
    const pos = getPointerPos(ev, canvas);
    drawingRef.current = true;
    lastPosRef.current = pos;
    const ctx = ctxRef.current;
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
    ev.preventDefault();
  };

  const stopDrawing = (ev) => {
    if (!isDrawer) return;
    drawingRef.current = false;
    lastPosRef.current = { x: 0, y: 0 };
    ev?.preventDefault();
  };

  const onPointerMove = (ev) => {
    if (!isDrawer || !drawingRef.current) return;
    const canvas = canvasRef.current;
    const pos = getPointerPos(ev, canvas);
    const ctx = ctxRef.current;
    if (!ctx) return;

    // draw locally
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    // emit to server using the canonical 'draw' event (server previously used 'draw')
    if (socket) {
      // emit compact { x, y } to allow server to re-broadcast
      socket.emit("draw", { x: pos.x, y: pos.y, roomCode: roomId });
      // also emit 'drawing' for variants
      socket.emit("drawing", { x: pos.x, y: pos.y, roomCode: roomId });
    }

    lastPosRef.current = pos;
    ev.preventDefault();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !ctxRef.current) return;
    const ctx = ctxRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // tell server to clear client canvases (server handler may be 'clear-canvas')
    if (socket) {
      socket.emit("clear-canvas", { roomCode });
      socket.emit("clearCanvas", { roomCode });
    }
  };

  // Chat / guesses handling
  const submitChat = () => {
    if (!chatInput.trim() || !socket) return;
    const trimmed = chatInput.trim();

    // If guess equals the word (case-insensitive) — server handles correct-guess, but we send guess as chat-message first
    socket.emit("chat-message", { message: trimmed });
    // Some server implementations expect 'guess' or 'correct-guess' explicitly — but server usually checks chat content.
    // We keep it simple: send chat; server will respond with 'correct-guess' when appropriate.
    setChatInput("");
  };

  // utility to render players in order with scores / drawer indicator
  const renderPlayersList = () => {
    return players.map((p) => {
      const uname = p.username ?? p;
      const isD = p.isDrawer ?? (drawer === uname);
      const score = p.score ?? scores[uname] ?? 0;
      return (
        <li key={uname} className={`p-2 rounded ${isD ? "bg-yellow-100" : "bg-slate-50"}`}>
          <div className="flex justify-between items-center">
            <div>
              <strong>{uname}</strong>{" "}
              {isD && <span className="ml-1">🎨</span>}
            </div>
            <div className="text-sm text-gray-600">{score} pts</div>
          </div>
        </li>
      );
    });
  };

  // Leave room helper
  const leaveRoom = () => {
    if (socket) {
      try {
        socket.emit("leave-room", { roomCode: roomId, username });
        socket.disconnect();
      } catch (e) {
        // ignore
      }
    }
    navigate("/");
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-2xl font-bold">Room: {roomId}</h2>
        <div className="flex items-center gap-2">
          <div className="text-sm text-gray-600">Round: {round}</div>
          <div className="text-sm text-gray-600 ml-4">Timer: {timer}s</div>
          <Button onClick={leaveRoom} className="bg-red-500 text-white">Leave</Button>
        </div>
      </div>

      <Card className="mb-4 p-4">
        <div className="text-center">
          {drawer === username ? (
            <div>
              <div className="text-lg font-semibold">🎨 You are drawing</div>
              <div className="text-2xl font-bold mt-2">{word || "(waiting for word...)"}</div>
            </div>
          ) : (
            <div>
              <div className="text-lg font-semibold">🖌️ {drawer || "Waiting..." } is drawing</div>
              <div className="text-xl text-gray-700 mt-2">{maskedWord || "(word hidden)"}</div>
            </div>
          )}
        </div>
      </Card>

      <div className="flex flex-col md:flex-row gap-4">
        {/* Canvas area */}
        <div className="flex-1">
          <Card className="p-2">
            <div className="w-full" style={{ height: "min(65vh, 520px)" }}>
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseUp={stopDrawing}
                onMouseMove={onPointerMove}
                onTouchStart={startDrawing}
                onTouchEnd={stopDrawing}
                onTouchMove={onPointerMove}
                className={`w-full h-full bg-white rounded border ${drawer === username ? "cursor-crosshair" : "opacity-90"}`}
              />
            </div>

            <div className="flex gap-2 mt-3">
              <Button onClick={clearCanvas}>Clear</Button>
              <Button onClick={() => {
                // request a new drawer / next round (if allowed)
                if (socket) {
                  socket.emit("next-round", { roomCode: roomId });
                  socket.emit("nextRound", { roomId: roomId });
                }
              }}>
                Next Round
              </Button>
            </div>
          </Card>
        </div>

        {/* Chat + Players column */}
        <div className="md:w-80 flex flex-col gap-3">
          <Card className="p-2 flex flex-col" style={{ minHeight: 300 }}>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold">Players</h3>
              <div className="text-sm text-gray-600">{players.length}</div>
            </div>
            <ul className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: 220 }}>
              {renderPlayersList()}
            </ul>
          </Card>

          <Card className="p-2 flex flex-col">
            <div className="mb-2 flex justify-between items-center">
              <h3 className="font-semibold">Chat</h3>
            </div>
            <ul className="flex-1 overflow-y-auto border rounded p-2 mb-2" style={{ maxHeight: 200 }}>
              {messages.map((m, i) => (
                <li key={i} className={m.system ? "italic text-gray-500 mb-1" : "mb-1"}>
                  {m.system ? m.text : `${m.username}: ${m.message}`}
                </li>
              ))}
            </ul>

            <div className="flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submitChat(); }}
                placeholder={drawer === username ? "(You are drawing — chat disabled for guesses)" : "Type guess or chat"}
                disabled={drawer === username}
              />
              <Button onClick={submitChat} disabled={!chatInput.trim() || drawer === username}>Send</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
