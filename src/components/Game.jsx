import React, { useEffect, useState } from "react";
import Canvas from "./Canvas";
import Chat from "./Chat";
import { initSocket } from "../utils/socket";

export default function Game({ username, roomId }) {
  const [socket, setSocket] = useState(null);
  const [players, setPlayers] = useState([]);
  const [drawer, setDrawer] = useState(null);
  const [word, setWord] = useState("");
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const s = initSocket();
    setSocket(s);

    s.emit("joinRoom", { roomId, username });

    s.on("updatePlayers", setPlayers);
    s.on("setDrawer", setDrawer);
    s.on("newWord", (newWord) => setWord(newWord));
    s.on("chatMessage", (msg) => setMessages((prev) => [...prev, msg]));
    s.on("correctGuess", (msg) =>
      setMessages((prev) => [...prev, { system: true, text: msg }])
    );
    s.on("gameStarted", () => setIsGameStarted(true));

    return () => s.disconnect();
  }, [roomId, username]);

  const startGame = () => socket?.emit("startGame");

  return (
    <div className="flex flex-col items-center p-4">
      <h2 className="text-xl font-bold mb-2">Room: {roomId}</h2>
      <p className="mb-4">Players: {players.join(", ")}</p>

      {drawer === username && word ? (
        <p className="mb-2">🎨 You are drawing: <strong>{word}</strong></p>
      ) : (
        <p className="mb-2">
          {drawer ? `🖌️ ${drawer} is drawing...` : "Waiting for game to start..."}
        </p>
      )}

      {!isGameStarted && (
        <button
          className="bg-green-500 text-white px-4 py-2 rounded mb-4"
          onClick={startGame}
        >
          Start Game
        </button>
      )}

      <div className="flex flex-col md:flex-row gap-4 w-full max-w-5xl">
        <Canvas socket={socket} isDrawer={drawer === username} />
        <Chat socket={socket} username={username} messages={messages} />
      </div>
    </div>
  );
}
