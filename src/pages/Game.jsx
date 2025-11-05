import React, { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import Canvas from "../components/Canvas";
import Chat from "../components/Chat";
import { initSocket } from "../utils/socket";
import Card from "../components/ui/Card";

export default function Game() {
  const { roomId } = useParams();
  const location = useLocation();
  const username = location.state?.username || "Player";

  const [socket, setSocket] = useState(null);
  const [players, setPlayers] = useState([]);
  const [drawer, setDrawer] = useState(null);
  const [word, setWord] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const s = initSocket();
    setSocket(s);

    s.emit("joinRoom", { roomId, username });

    s.on("updatePlayers", setPlayers);
    s.on("setDrawer", setDrawer);
    s.on("newWord", (w) => setWord(w));
    s.on("chatMessage", (msg) => setMessages((prev) => [...prev, msg]));
    s.on("correctGuess", (msg) =>
      setMessages((prev) => [...prev, { system: true, text: msg }])
    );

    return () => s.disconnect();
  }, []);

  const isDrawer = drawer === username;

  return (
    <div className="flex flex-col items-center w-full p-4 gap-4 max-w-5xl">
      <h2 className="text-3xl font-display text-purple text-center">
        Room: {roomId}
      </h2>

      <Card className="w-full text-center p-4">
        {isDrawer ? (
          <p className="text-xl font-bold text-pink">
            🎨 You are drawing: <span className="underline">{word}</span>
          </p>
        ) : (
          <p className="text-xl font-bold text-blue">
            🖌️ {drawer || "Waiting for drawer"} is drawing...
          </p>
        )}
      </Card>

      <div className="flex flex-col md:flex-row w-full gap-4">
        <Canvas socket={socket} isDrawer={isDrawer} />

        <Chat socket={socket} username={username} messages={messages} />
      </div>

      <Card className="w-full flex justify-between p-4">
        <p className="text-sm text-gray-600">Players: {players.join(", ")}</p>
        <p className="text-sm text-gray-600">Drawer: {drawer}</p>
      </Card>
    </div>
  );
}
