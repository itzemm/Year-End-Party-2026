"use client";

import { useState } from "react";

// Snowflakes and gifts tumbling down after a win.
export function Confetti() {
  const [pieces] = useState(() =>
    Array.from({ length: 40 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.8,
      duration: 2.2 + Math.random() * 1.6,
      char: ["❄", "❅", "❆", "✦", "🎁", "⭐"][i % 6],
      rot: Math.random() * 360,
    }))
  );
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <span key={i} style={{ left: `${p.left}%`, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s`, "--rot": `${p.rot}deg` }}>
          {p.char}
        </span>
      ))}
    </div>
  );
}
