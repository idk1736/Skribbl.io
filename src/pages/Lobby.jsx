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
  const [hostId, setHostId] = useState(null);

  useEffect(() => {
    const s = initSocket();
    setSocket(s);

    // Join the room
    s.emit("joinRoom", { roomId, username });

    // Update players list
    s.on("updatePlayers", (playerList) => {
      setPlayers(playerList);

      // The first player to join becomes host
      if (!hostId && playerList.length) setHostId(playerList[0]);
    });

    // Game started -> navigate to game page
    s.on("gameStarted", () => {
      navigate(`/game/${roomId}`, { state: { username } });
    });

    return () => s.disconnect();
  }, []);

  const startGame = () => {
    if (socket) socket.emit("startGame");
  };

  const isHost = players[0] === username;

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
                p === players[0] ? "bg-yellow font-bold" : "bg-blue-200"
              }`}
            >
              {p} {p === players[0] ? "(Host)" : ""}
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

      <p className="text-center text-gray-600">
        Share this room code with friends to join: <strong>{roomId}</strong>
      </p>
    </div>
  );
}
