import React, { useState, useRef, useEffect } from "react";
import Card from "./ui/Card";
import Button from "./ui/Button";

export default function Chat({ socket, username, messages }) {
  const [input, setInput] = useState("");
  const chatEndRef = useRef();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (input.trim() === "") return;
    socket?.emit("chatMessage", { username, text: input.trim() });
    setInput("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  return (
    <Card className="w-full md:w-1/3 flex flex-col p-2">
      <div className="flex-1 overflow-y-auto mb-2 space-y-1 p-2 bg-blue-50 rounded-xl">
        {messages.map((msg, i) =>
          msg.system ? (
            <div
              key={i}
              className="bg-yellow-200 text-center text-gray-800 rounded-xl p-2 text-sm italic"
            >
              {msg.text}
            </div>
          ) : (
            <div
              key={i}
              className={`p-2 rounded-xl ${
                msg.username === username ? "bg-green-200 self-end" : "bg-white"
              }`}
            >
              <strong>{msg.username}:</strong> {msg.text}
            </div>
          )
        )}
        <div ref={chatEndRef}></div>
      </div>

      <div className="flex gap-2 mt-2">
        <input
          className="flex-1 p-2 rounded-xl border-2 border-purple focus:outline-none focus:border-pink text-lg"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Type your guess..."
        />
        <Button onClick={sendMessage} className="bg-blue">
          Send
        </Button>
      </div>
    </Card>
  );
}
