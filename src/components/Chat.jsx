import React, { useState, useEffect, useRef } from "react";

export default function Chat({ socket, username, messages }) {
  const [input, setInput] = useState("");
  const chatEndRef = useRef();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (input.trim()) {
      socket.emit("chatMessage", { username, text: input.trim() });
      setInput("");
    }
  };

  return (
    <div className="w-full md:w-1/3 bg-gray-100 p-4 rounded-2xl shadow flex flex-col">
      <h3 className="font-bold mb-2">Chat</h3>
      <div className="flex-1 overflow-y-auto mb-2 border rounded p-2 bg-white">
        {messages.map((m, i) =>
          m.system ? (
            <p key={i} className="text-sm text-center text-blue-500 italic">{m.text}</p>
          ) : (
            <p key={i}>
              <strong>{m.username}: </strong>{m.text}
            </p>
          )
        )}
        <div ref={chatEndRef} />
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 border p-2 rounded"
          placeholder="Type your guess..."
        />
        <button
          onClick={sendMessage}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Send
        </button>
      </div>
    </div>
  );
}
