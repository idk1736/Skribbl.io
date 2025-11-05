import React from "react";

export default function Button({ children, onClick, className, ...props }) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 rounded-2xl font-bold text-white shadow-lg transition transform hover:scale-105 ${
        className || "bg-pink"
      }`}
      {...props}
    >
      {children}
    </button>
  );
}
