import React, { useState } from "react";

export default function Lobby({ setRoomId, setUsername }) {
  const [inputName, setInputName] = useState("");
  const [inputRoom, setInputRoom] = useState("");

  const handleJoin = () => {
    if (!inputName || !inputRoom) {
      alert("Please enter a username and room ID!");
      return;
    }
    setUsername(inputName);
    setRoomId(inputRoom);
  };

  const handleCreate = () => {
    if (!inputName) {
      alert("Please enter a username!");
      return;
    }
    const newRoom = Math.random().toString(36).substring(2, 8).toUpperCase();
    setUsername(inputName);
    setRoomId(newRoom);
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-md w-80 flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-center mb-4">Skribbl Clone</h1>

      <input
        type="text"
        placeholder="Your Name"
        value={inputName}
        onChange={(e) => setInputName(e.target.value)}
        className="border p-2 rounded w-full"
      />

      <input
        type="text"
        placeholder="Room ID"
        value={inputRoom}
        onChange={(e) => setInputRoom(e.target.value)}
        className="border p-2 rounded w-full"
      />

      <button
        onClick={handleJoin}
        className="bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
      >
        Join Room
      </button>

      <div className="text-center text-gray-500 my-2">or</div>

      <button
        onClick={handleCreate}
        className="bg-green-500 text-white py-2 rounded hover:bg-green-600"
      >
        Create Room
      </button>
    </div>
  );
}
