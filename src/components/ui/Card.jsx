import React from "react";

export default function Card({ children, className }) {
  return (
    <div
      className={`bg-white bg-opacity-90 backdrop-blur-lg rounded-3xl p-6 shadow-lg ${className}`}
    >
      {children}
    </div>
  );
}
