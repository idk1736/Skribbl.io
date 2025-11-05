import React, { useEffect, useState, useRef } from "react";

export default function Chat({ socket, username }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    socket.on("chatMessage", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("correctGuess", (msg) => {
      setMessages((prev) => [...prev, { system: true, text: msg }]);
    });

    return () => {
      socket.off("chatMessage");
      socket.off("correctGuess");
    };
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || !socket) return;
    socket.emit("chatMessage", { username, text: input });
    setInput("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  return (
    <div className="flex flex-col h-96">
      <div className="flex-1 overflow-y-auto border rounded p-2 mb-2 bg-gray-50">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={msg.system ? "text-green-600 italic" : "text-gray-800"}
          >
            {msg.system ? msg.text : <strong>{msg.username}:</strong>}{" "}
            {!msg.system && msg.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          className="flex-1 border p-2 rounded"
          placeholder="Type your guess..."
        />
        <button
          onClick={sendMessage}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Send
        </button>
      </div>
    </div>
  );
}
