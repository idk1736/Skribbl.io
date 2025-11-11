import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { initSocket } from "../utils/socket";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

export default function Game() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const username = location.state?.username || "Player";

  const [socket, setSocket] = useState(null);
  const [players, setPlayers] = useState([]);
  const [drawer, setDrawer] = useState(null);
  const [word, setWord] = useState("");
  const [maskedWord, setMaskedWord] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [round, setRound] = useState(1);
  const [timer, setTimer] = useState(0);
  const [scores, setScores] = useState({});
  const [isGameOver, setIsGameOver] = useState(false);

  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawing = useRef(false);

  const isDrawer = drawer === username;

  // ⏱️ Timer countdown
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  // 🎮 Initialize Socket
  useEffect(() => {
    const s = initSocket();
    setSocket(s);

    s.emit("join-room", { roomCode: roomId, username });

    // --- Player & Drawer Management ---
    s.on("player-list", (playerList) => setPlayers(playerList));
    s.on("set-drawer", ({ drawer }) => setDrawer(drawer));
    s.on("round-start", ({ word, drawer, round, time }) => {
      setDrawer(drawer);
      setRound(round);
      setTimer(time);
      if (drawer === username) {
        setWord(word);
        setMaskedWord("");
      } else {
        setWord("");
        setMaskedWord("_ ".repeat(word.length));
      }
      setMessages((prev) => [
        ...prev,
        { system: true, text: `🎮 Round ${round} started!` },
      ]);
      clearCanvas();
    });

    // --- Drawing Data ---
    s.on("draw-data", (data) => drawLine(data, false));

    // --- Chat & Guesses ---
    s.on("chat-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    s.on("correct-guess", ({ username }) => {
      setMessages((prev) => [
        ...prev,
        { system: true, text: `✅ ${username} guessed the word!` },
      ]);
    });

    s.on("round-ended", ({ word }) => {
      setMessages((prev) => [
        ...prev,
        { system: true, text: `🕓 Round ended! The word was "${word}".` },
      ]);
    });

    s.on("game-over", (finalScores) => {
      setScores(finalScores);
      setIsGameOver(true);
    });

    s.on("disconnect", () => {
      setMessages((prev) => [
        ...prev,
        { system: true, text: "⚠️ Disconnected from server." },
      ]);
    });

    return () => s.disconnect();
  }, []);

  // 🖌️ Canvas Setup
  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#000000";
    ctxRef.current = ctx;
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // 🖍️ Drawing logic
  const handleMouseDown = (e) => {
    if (!isDrawer) return;
    drawing.current = true;
    const { offsetX, offsetY } = e.nativeEvent;
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(offsetX, offsetY);
  };

  const handleMouseUp = () => {
    if (!isDrawer) return;
    drawing.current = false;
    ctxRef.current.closePath();
  };

  const handleMouseMove = (e) => {
    if (!isDrawer || !drawing.current) return;
    const { offsetX, offsetY } = e.nativeEvent;
    drawLine({ x: offsetX, y: offsetY }, true);
  };

  const drawLine = (data, emit) => {
    const ctx = ctxRef.current;
    ctx.lineTo(data.x, data.y);
    ctx.stroke();
    if (emit && socket) socket.emit("drawing", { roomCode: roomId, ...data });
  };

  // ✉️ Chat System
  const sendMessage = () => {
    if (!chatInput.trim() || !socket) return;
    if (!isDrawer && word && chatInput.toLowerCase() === word.toLowerCase()) {
      socket.emit("correct-guess", { username });
    } else {
      socket.emit("chat-message", { message: chatInput });
    }
    setChatInput("");
  };

  const leaveGame = () => {
    if (socket) socket.disconnect();
    navigate("/");
  };

  return (
    <div className="flex flex-col items-center w-full p-2 md:p-4 max-w-6xl mx-auto">
      <div className="flex justify-between w-full items-center">
        <h2 className="text-2xl md:text-3xl font-display text-purple">
          Room: {roomId}
        </h2>
        <Button onClick={leaveGame} className="bg-red-500 text-white">
          Leave Game
        </Button>
      </div>

      {/* Drawer and Word Info */}
      <Card className="w-full mt-3 text-center">
        {isDrawer ? (
          <p className="text-xl font-bold text-pink">
            🎨 You are drawing: <span className="underline">{word}</span>
          </p>
        ) : (
          <p className="text-xl font-bold text-blue">
            🖌️ {drawer || "Waiting for drawer"} is drawing...
            <br />
            <span className="text-gray-600 text-lg">{maskedWord}</span>
          </p>
        )}
        <p className="text-gray-500 mt-1">
          Round {round} | Time: {timer}s
        </p>
      </Card>

      {/* Game Layout */}
      <div className="flex flex-col md:flex-row gap-4 w-full mt-4">
        {/* Canvas */}
        <div className="flex-1 relative">
          <Card className="p-2">
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseMove={handleMouseMove}
              className={`border rounded w-full h-[300px] md:h-[500px] bg-white ${
                isDrawer ? "cursor-crosshair" : "cursor-not-allowed opacity-80"
              }`}
            />
          </Card>
        </div>

        {/* Chat & Players */}
        <div className="flex flex-col md:w-[35%] gap-4">
          <Card className="flex flex-col h-[300px] md:h-[500px] p-2 overflow-y-auto">
            <h3 className="text-lg font-bold mb-1">Players</h3>
            <ul className="flex flex-col gap-1">
              {players.map((p) => (
                <li
                  key={p.username}
                  className={`p-1 rounded ${
                    p.username === drawer
                      ? "bg-yellow-200 font-semibold"
                      : "bg-blue-100"
                  }`}
                >
                  {p.username}{" "}
                  {p.username === drawer && "🎨"}{" "}
                  <span className="text-gray-500">
                    ({p.score ?? 0} pts)
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="flex flex-col p-2">
            <h3 className="text-lg font-bold mb-1">Chat</h3>
            <ul className="flex flex-col flex-1 overflow-y-auto p-1 max-h-[200px] border rounded">
              {messages.map((m, i) => (
                <li
                  key={i}
                  className={m.system ? "italic text-gray-500" : ""}
                >
                  {m.system ? m.text : `${m.username}: ${m.message}`}
                </li>
              ))}
            </ul>
            <div className="flex mt-2 gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Type your guess..."
                disabled={isDrawer}
              />
              <Button onClick={sendMessage} disabled={isDrawer}>
                Send
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Game Over Modal */}
      {isGameOver && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <Card className="bg-white p-6 rounded-2xl max-w-md w-full text-center">
            <h2 className="text-2xl font-bold text-pink mb-4">🏁 Game Over!</h2>
            <ul className="text-left mb-4">
              {Object.entries(scores)
                .sort((a, b) => b[1] - a[1])
                .map(([player, score], idx) => (
                  <li key={player} className="text-lg">
                    {idx + 1}. {player} — <b>{score}</b> pts
                  </li>
                ))}
            </ul>
            <Button onClick={leaveGame} className="bg-green text-white w-full">
              Back to Home
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
