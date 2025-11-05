import React, { useRef, useEffect, useState } from "react";

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

    socket.on("draw", ({ x0, y0, x1, y1 }) => {
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    });

    socket.on("clearCanvas", () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });
  }, [socket]);

  const startDraw = (e) => {
    if (!isDrawer) return;
    setIsDrawing(true);
    draw(e);
  };

  const endDraw = () => setIsDrawing(false);

  const draw = (e) => {
    if (!isDrawing || !isDrawer) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.nativeEvent.offsetX || e.touches?.[0].clientX - rect.left;
    const y = e.nativeEvent.offsetY || e.touches?.[0].clientY - rect.top;
    const ctx = ctxRef.current;
    ctx.lineTo(x, y);
    ctx.stroke();
    socket.emit("draw", { x0: x, y0: y, x1: x, y1: y });
  };

  return (
    <div className="flex flex-col w-full md:w-2/3">
      <canvas
        ref={canvasRef}
        width={600}
        height={400}
        className={`border rounded-2xl bg-white shadow ${!isDrawer ? "opacity-60" : ""}`}
        onMouseDown={startDraw}
        onMouseUp={endDraw}
        onMouseMove={draw}
        onTouchStart={startDraw}
        onTouchEnd={endDraw}
        onTouchMove={draw}
      />
      {isDrawer && (
        <button
          className="bg-red-500 text-white px-4 py-2 rounded mt-2 self-end"
          onClick={() => socket.emit("clearCanvas")}
        >
          Clear
        </button>
      )}
    </div>
  );
}
