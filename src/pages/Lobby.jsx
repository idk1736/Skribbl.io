import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { initSocket } from "../utils/socket";

export default function Lobby() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const username = location.state?.username || "Player";

  const [socket, setSocket] = useState(null);
  const [players, setPlayers] = useState([]);
  const [host, setHost] = useState(null);
  const [messages, setMessages] = useState([]);
  const [drawer, setDrawer] = useState(null);

  useEffect(() => {
    const s = initSocket();
    setSocket(s);

    // Join the room
    s.emit("join-room", { roomCode: roomId, username });

    // Listen for player list updates
    s.on("player-list", (playerList) => {
      setPlayers(playerList.map((p) => p.username));
      if (!host && playerList.length) setHost(playerList[0].username);
    });

    // Listen for drawer assignment
    s.on("you-are-drawer", ({ word }) => {
      setDrawer(username);
    });

    s.on("new-drawer", ({ drawer: drawerName }) => {
      setDrawer(drawerName);
    });

    // Chat and system messages
    s.on("chat-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    s.on("correct-guess", ({ username: winner }) => {
      setMessages((prev) => [...prev, { system: true, text: `${winner} guessed the word! 🎉` }]);
    });

    // Game started -> navigate to game page
    s.on("gameStarted", () => {
      navigate(`/game/${roomId}`, { state: { username } });
    });

    // Cleanup on unmount
    return () => {
      s.disconnect();
    };
  }, []);

  const startGame = () => {
    if (socket) socket.emit("startGame");
  };

  const isHost = host === username;

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md p-4 gap-6">
      <h2 className="text-3xl font-display text-purple text-center">
        Lobby: {roomId}
      </h2>

      <Card className="w-full flex flex-col gap-4">
        <h3 className="text-xl font-bold text-pink">Players</h3>
        <ul className="flex flex-col gap-2">
          {players.map((p) => (
            <li
              key={p}
              className={`p-2 rounded-xl ${
                p === host ? "bg-yellow font-bold" : "bg-blue-200"
              }`}
            >
              {p} {p === host ? "(Host)" : ""} {p === drawer ? "🎨" : ""}
            </li>
          ))}
        </ul>

        <Button
          onClick={startGame}
          disabled={!isHost || players.length < 2}
          className={`mt-4 ${isHost ? "bg-green" : "bg-gray-400 cursor-not-allowed"}`}
        >
          {players.length < 2
            ? "Waiting for players..."
            : isHost
            ? "Start Game"
            : "Waiting for host..."}
        </Button>
      </Card>

      <Card className="w-full flex flex-col gap-2">
        <h3 className="text-lg font-bold">Lobby Chat</h3>
        <ul className="flex flex-col gap-1 max-h-32 overflow-y-auto p-2 border rounded">
          {messages.map((m, i) => (
            <li key={i} className={m.system ? "italic text-gray-500" : ""}>
              {m.system ? m.text : `${m.username}: ${m.message}`}
            </li>
          ))}
        </ul>
      </Card>

      <p className="text-center text-gray-600">
        Share this room code with friends to join: <strong>{roomId}</strong>
      </p>
    </div>
  );
}
