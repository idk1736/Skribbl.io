import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

export default function Home() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");

  const generateRoom = () => {
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    navigate(`/lobby/${newRoomId}`, { state: { username } });
  };

  const joinRoom = () => {
    if (!roomId) return;
    navigate(`/lobby/${roomId}`, { state: { username } });
  };

  return (
    <div className="flex flex-col items-center justify-center gap-8 w-full max-w-md p-4">
      <h1 className="text-4xl font-display text-pink text-center">Skribbl Clone</h1>

      <Card className="w-full flex flex-col gap-4">
        <Input
          placeholder="Enter your name"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <Button
          onClick={generateRoom}
          className="bg-blue text-white"
          disabled={!username}
        >
          Create Room
        </Button>

        <div className="flex gap-2 items-center">
          <Input
            placeholder="Room Code"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
          />
          <Button onClick={joinRoom} className="bg-green" disabled={!username || !roomId}>
            Join
          </Button>
        </div>
      </Card>

      <p className="text-center text-gray-600">
        Play with friends! Create a room or join one using the code.
      </p>
    </div>
  );
}
