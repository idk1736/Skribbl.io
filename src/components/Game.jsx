import React, { useEffect, useState } from "react";
import Canvas from "./Canvas";
import Chat from "./Chat";
import { initSocket } from "../utils/socket";

export default function Game({ roomId, username }) {
  const [socket, setSocket] = useState(null);
  const [players, setPlayers] = useState([]);
  const [drawer, setDrawer] = useState("");
  const [word, setWord] = useState("");
  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
    const s = initSocket();
    setSocket(s);

    s.emit("joinRoom", { roomId, username });

    s.on("updatePlayers", (playerList) => {
      setPlayers(playerList);
    });

    s.on("setDrawer", (drawerName) => {
      setDrawer(drawerName);
    });

    s.on("newWord", (newWord) => {
      setWord(newWord);
    });

    s.on("gameStarted", () => {
      setGameStarted(true);
    });

    return () => {
      s.disconnect();
    };
  }, []);

  const startGame = () => {
    if (socket) socket.emit("startGame");
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col md:flex-row gap-4 p-4">
      <div className="flex-1 flex flex-col bg-white rounded-xl shadow p-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-bold text-lg">Room: {roomId}</h2>
          <button
            onClick={startGame}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Start Game
          </button>
        </div>

        <div className="mb-2">
          <strong>Drawer:</strong> {drawer}
        </div>

        <div className="mb-2">
          {drawer === username ? (
            <span>
              Draw this word: <strong>{word}</strong>
            </span>
          ) : (
            <span>Guess the word!</span>
          )}
        </div>

        <Canvas socket={socket} isDrawer={drawer === username} />
      </div>

      <div className="w-full md:w-80 flex flex-col bg-white rounded-xl shadow p-4">
        <Chat socket={socket} username={username} />
        <div className="mt-4">
          <h3 className="font-bold mb-2">Players:</h3>
          <ul className="list-disc list-inside">
            {players.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
