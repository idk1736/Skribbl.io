import React, { useEffect, useState, useRef } from "react";
import { useLocation, useParams } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Canvas from "../components/Canvas";
import Chat from "../components/Chat";
import { initSocket } from "../utils/socket";
import { motion } from "framer-motion";

export default function Game() {
  const { roomId } = useParams();
  const location = useLocation();
  const username = location.state?.username || "Player";
  const password = location.state?.password || null;
  const isPrivate = location.state?.isPrivate || false;

  const [socket, setSocket] = useState(null);
  const [players, setPlayers] = useState([]);
  const [drawer, setDrawer] = useState(null);
  const [word, setWord] = useState("");
  const [round, setRound] = useState(1);
  const [timer, setTimer] = useState(60);
  const [messages, setMessages] = useState([]);
  const [hint, setHint] = useState("");
  const [gameStarted, setGameStarted] = useState(false);

  const timerRef = useRef(null);
  const chatEndRef = useRef(null);

  const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => {
    const s = initSocket();
    setSocket(s);

    // Join the room
    s.emit("joinRoom", { roomId, username, password, isPrivate });

    // Player updates
    s.on("updatePlayers", (playerList) => setPlayers(playerList));
    s.on("setDrawer", (drawerName) => setDrawer(drawerName));

    // Game events
    s.on("newWord", ({ word: newWord, hint: newHint, round: newRound }) => {
      setWord(newWord);
      setHint(newHint || "_".repeat(newWord.length));
      setRound(newRound);
      setTimer(60);
      setGameStarted(true);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    });

    s.on("chatMessage", (msg) => {
      setMessages((prev) => [...prev, msg]);
      scrollToBottom();
    });

    s.on("correctGuess", ({ username: winner, word }) => {
      setMessages((prev) => [
        ...prev,
        { system: true, text: `${winner} guessed the word: "${word}"! 🎉` },
      ]);
      scrollToBottom();
    });

    s.on("gameEnded", () => {
      setGameStarted(false);
      setWord("");
      setHint("");
      setRound(0);
      setTimer(0);
    });

    return () => {
      s.disconnect();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const isDrawer = drawer === username;

  const sendMessage = (text) => {
    if (!text.trim() || !socket) return;
    socket.emit("chatMessage", { message: text });
  };

  const handleStartNextRound = () => {
    if (!socket) return;
    socket.emit("startNextRound");
  };

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-screen p-4 gap-6 bg-gradient-to-tr from-purple-50 via-pink-50 to-blue-50">
      <motion.h2
        className="text-4xl font-display text-purple-700 mb-4 drop-shadow-lg text-center"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        Room: {roomId} {isPrivate && "🔒"}
      </motion.h2>

      <Card className="w-full max-w-6xl flex flex-col gap-4 p-4 shadow-2xl bg-white/90 backdrop-blur-md rounded-2xl">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Canvas */}
          <div className="flex-1 flex flex-col gap-4">
            <Canvas socket={socket} isDrawer={isDrawer} />

            <div className="flex justify-between items-center p-2 mt-2 bg-purple-50 rounded-lg shadow-inner">
              <p className="font-semibold text-purple-600">Round: {round}</p>
              <p className="font-semibold text-purple-600">Time Left: {timer}s</p>
              <p className="font-semibold text-purple-600">
                Drawer: {drawer || "Waiting..."}
              </p>
            </div>

            {!isDrawer && gameStarted && (
              <Card className="bg-yellow-50 p-3 rounded-lg shadow-inner mt-2 text-center text-purple-700 font-semibold">
                Hint: {hint}
              </Card>
            )}
          </div>

          {/* Chat + Players */}
          <div className="w-full md:w-1/3 flex flex-col gap-4">
            <Card className="flex flex-col gap-2 h-full">
              <h3 className="text-lg font-bold text-purple-700">Players</h3>
              <ul className="flex flex-col gap-1 overflow-y-auto max-h-64 p-2">
                {players.map((p) => (
                  <li
                    key={p.username}
                    className={`p-2 rounded-lg font-medium ${
                      p.username === drawer
                        ? "bg-purple-200 text-purple-900 font-bold"
                        : "bg-blue-50 text-blue-900"
                    }`}
                  >
                    {p.username} {p.username === drawer ? "🎨" : ""}
                  </li>
                ))}
              </ul>

              <Chat
                socket={socket}
                username={username}
                messages={messages}
                chatEndRef={chatEndRef}
              />
            </Card>

            {isDrawer && gameStarted && (
              <Button
                onClick={handleStartNextRound}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-xl"
              >
                Start Next Round
              </Button>
            )}
          </div>
        </div>
      </Card>

      <motion.p
        className="text-center text-gray-700 mt-4 text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        🎨 Draw, guess, and have fun! The drawer sees the word, guessers try to find it.
      </motion.p>
    </div>
  );
}
