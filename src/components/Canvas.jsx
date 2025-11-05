import React, { useRef, useEffect, useState } from "react";
import Card from "./ui/Card";

export default function Canvas({ socket, isDrawer }) {
  const canvasRef = useRef();
  const ctxRef = useRef();
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "black";
    ctxRef.current = ctx;

    // Listen for drawing events from other players
    socket?.on("draw", ({ x0, y0, x1, y1 }) => {
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    });

    socket?.on("clearCanvas", () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });
  }, [socket]);

  const startDrawing = (e) => {
    if (!isDrawer) return;
    setIsDrawing(true);
    draw(e);
  };

  const endDrawing = () => setIsDrawing(false);

  const draw = (e) => {
    if (!isDrawing || !isDrawer) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.nativeEvent.offsetX || e.touches?.[0].clientX - rect.left;
    const y = e.nativeEvent.offsetY || e.touches?.[0].clientY - rect.top;

    const ctx = ctxRef.current;
    ctx.lineTo(x, y);
    ctx.stroke();

    socket?.emit("draw", { x0: x, y0: y, x1: x, y1: y });
  };

  const clearCanvas = () => {
    socket?.emit("clearCanvas");
  };

  return (
    <Card className="flex-1 p-2">
      <canvas
        ref={canvasRef}
        width={600}
        height={400}
        className={`border-4 border-purple rounded-2xl bg-white shadow-lg w-full touch-none`}
        onMouseDown={startDrawing}
        onMouseUp={endDrawing}
        onMouseMove={draw}
        onTouchStart={startDrawing}
        onTouchEnd={endDrawing}
        onTouchMove={draw}
      />
      {isDrawer && (
        <button
          className="mt-2 bg-red-400 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-2xl shadow-lg w-full"
          onClick={clearCanvas}
        >
          Clear Canvas
        </button>
      )}
    </Card>
  );
}
