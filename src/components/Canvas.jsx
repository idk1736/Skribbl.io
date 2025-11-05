import React, { useRef, useEffect, useState } from "react";

export default function Canvas({ socket, isDrawer }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [ctx, setCtx] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const context = canvas.getContext("2d");
    context.lineCap = "round";
    context.lineWidth = 4;
    context.strokeStyle = "#000";
    setCtx(context);
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on("draw", ({ x0, y0, x1, y1, color }) => {
      drawLine(x0, y0, x1, y1, color, false);
    });

    return () => socket.off("draw");
  }, [socket, ctx]);

  const startDrawing = ({ nativeEvent }) => {
    if (!isDrawer) return;
    const { offsetX, offsetY } = nativeEvent;
    setDrawing(true);
    setLastPos({ x: offsetX, y: offsetY });
  };

  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  const stopDrawing = () => {
    if (!isDrawer) return;
    setDrawing(false);
  };

  const draw = ({ nativeEvent }) => {
    if (!drawing || !ctx || !isDrawer) return;
    const { offsetX, offsetY } = nativeEvent;
    drawLine(lastPos.x, lastPos.y, offsetX, offsetY, "#000", true);
    setLastPos({ x: offsetX, y: offsetY });
  };

  const drawLine = (x0, y0, x1, y1, color, emit) => {
    if (!ctx) return;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.closePath();

    if (!emit || !socket) return;
    socket.emit("draw", { x0, y0, x1, y1, color });
  };

  const clearCanvas = () => {
    if (!ctx || !isDrawer) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    if (socket) socket.emit("clearCanvas");
  };

  useEffect(() => {
    if (!socket) return;
    socket.on("clearCanvas", () => {
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    });
    return () => socket.off("clearCanvas");
  }, [socket, ctx]);

  return (
    <div className="flex flex-col flex-1 h-96 border rounded overflow-hidden">
      <canvas
        ref={canvasRef}
        className="flex-1 w-full h-full"
        onMouseDown={startDrawing}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
        onMouseMove={draw}
        onTouchStart={(e) => startDrawing({ nativeEvent: e.touches[0] })}
        onTouchMove={(e) => draw({ nativeEvent: e.touches[0] })}
        onTouchEnd={stopDrawing}
      />
      {isDrawer && (
        <button
          onClick={clearCanvas}
          className="mt-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Clear
        </button>
      )}
    </div>
  );
}
