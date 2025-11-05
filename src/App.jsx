import React, { useState } from "react";
import Lobby from "./components/Lobby";
import Game from "./components/Game";

export default function App() {
  const [roomId, setRoomId] = useState(null);
  const [username, setUsername] = useState("");

  return (
    <div className="min-h-screen flex items-center justify-center">
      {!roomId ? (
        <Lobby setRoomId={setRoomId} setUsername={setUsername} />
      ) : (
        <Game roomId={roomId} username={username} />
      )}
    </div>
  );
}
