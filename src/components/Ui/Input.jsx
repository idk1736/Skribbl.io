import React from "react";

export default function Input({ className, ...props }) {
  return (
    <input
      className={`p-3 rounded-xl border-2 border-blue-300 focus:border-pink focus:outline-none text-lg placeholder-gray-400 ${className}`}
      {...props}
    />
  );
}
