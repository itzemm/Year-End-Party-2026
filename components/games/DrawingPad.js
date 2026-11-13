"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

const SIZE = 600; // internal canvas resolution (square)
const COLORS = ["#111111", "#d62828", "#1d6fd8", "#2a9d3c", "#f08c00", "#7b4a2a", "#9b5de5", "#ffffff"];
const BRUSHES = [
  { label: "S", width: 4 },
  { label: "M", width: 9 },
  { label: "L", width: 18 },
];

// Finger/mouse drawing canvas. Parent reads the picture with ref.current.toDataUrl().
const DrawingPad = forwardRef(function DrawingPad({ disabled = false }, ref) {
  const canvasRef = useRef(null);
  const strokes = useRef([]);
  const current = useRef(null);
  const [color, setColor] = useState(COLORS[0]);
  const [brush, setBrush] = useState(BRUSHES[1].width);
  const [count, setCount] = useState(0); // number of strokes, to re-render buttons

  const redraw = useCallback(() => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const s of [...strokes.current, current.current].filter(Boolean)) {
      ctx.strokeStyle = s.color;
      ctx.fillStyle = s.color;
      ctx.lineWidth = s.width;
      if (s.points.length === 1) {
        const [x, y] = s.points[0];
        ctx.beginPath();
        ctx.arc(x, y, s.width / 2, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      ctx.beginPath();
      s.points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    }
  }, []);

  useEffect(() => redraw(), [redraw]);

  useImperativeHandle(ref, () => ({
    hasDrawing: () => strokes.current.length > 0,
    toDataUrl: () => canvasRef.current.toDataURL("image/jpeg", 0.75),
  }));

  const point = (e) => {
    const box = canvasRef.current.getBoundingClientRect();
    return [((e.clientX - box.left) / box.width) * SIZE, ((e.clientY - box.top) / box.height) * SIZE];
  };

  function down(e) {
    if (disabled) return;
    e.preventDefault();
    canvasRef.current.setPointerCapture(e.pointerId);
    current.current = { color, width: brush, points: [point(e)] };
    redraw();
  }
  function move(e) {
    if (!current.current) return;
    e.preventDefault();
    current.current.points.push(point(e));
    redraw();
  }
  function up() {
    if (!current.current) return;
    strokes.current.push(current.current);
    current.current = null;
    setCount(strokes.current.length);
    redraw();
  }

  return (
    <div className={`drawing-pad ${disabled ? "disabled" : ""}`}>
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        aria-label="Drawing area"
      />
      <div className="pad-tools">
        <div className="pad-colors">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`swatch ${c === color ? "active" : ""}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={c === "#ffffff" ? "Eraser (white)" : `Colour ${c}`}
              title={c === "#ffffff" ? "Eraser" : undefined}
            />
          ))}
        </div>
        <div className="pad-actions">
          {BRUSHES.map((b) => (
            <button key={b.label} type="button" className={`pad-btn ${b.width === brush ? "active" : ""}`} onClick={() => setBrush(b.width)}>
              {b.label}
            </button>
          ))}
          <button
            type="button"
            className="pad-btn"
            disabled={!count || disabled}
            onClick={() => {
              strokes.current.pop();
              setCount(strokes.current.length);
              redraw();
            }}
          >
            ↶ Undo
          </button>
          <button
            type="button"
            className="pad-btn"
            disabled={!count || disabled}
            onClick={() => {
              strokes.current = [];
              setCount(0);
              redraw();
            }}
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
});

export default DrawingPad;
