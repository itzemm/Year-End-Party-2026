"use client";

import { useEffect, useRef, useState } from "react";

const COLORS = ["#2b6fc2", "#a9dcff", "#163a6b", "#e4f5ff", "#3f8be0", "#7cc4f5"];
const DARK_TEXT = new Set(["#a9dcff", "#e4f5ff", "#7cc4f5"]);

// A wheel of the guests in the draw, names as big as their slice allows. When `target` changes it spins and lands on
// that guest's slice under the pointer at the top.
export default function PrizeWheel({ entries, target, spinMs, onStopped }) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const stopped = useRef(onStopped);
  stopped.current = onStopped;

  const n = Math.max(entries.length, 1);
  const slice = 360 / n;

  useEffect(() => {
    if (!target) return;
    const i = entries.findIndex((e) => e.ticketNo === target.ticketNo);
    if (i < 0) return;
    const jitter = (Math.random() - 0.5) * slice * 0.6;
    setRotation((prev) => {
      const base = prev - (((prev % 360) + 360) % 360);
      const landing = (((360 - (i + 0.5) * slice + jitter) % 360) + 360) % 360;
      return base + 360 * 7 + landing;
    });
    setSpinning(true);
    const t = setTimeout(() => {
      setSpinning(false);
      stopped.current?.();
    }, spinMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const R = 200;
  const HUB = 36; // centre circle radius
  // Each name gets the biggest font that fits its slice: limited by the slice's
  // width (arc) and by the room from the rim to the centre (name length).
  const fontFor = (label) => {
    const room = R - 14 - HUB - 6;
    const half = Math.min(Math.PI / 2, (slice * Math.PI) / 360);
    let f = Math.min(34, room / (Math.max(label.length, 3) * 0.56));
    if (n === 1) return f;
    // Shrink until the slice is wide enough where the text ends (nearest the centre).
    for (let i = 0; i < 60; i++) {
      const textLen = label.length * 0.56 * f;
      const innerR = Math.max(HUB + 4, R - 14 - textLen);
      if (2 * innerR * Math.sin(half) >= f) break;
      f *= 0.94;
    }
    return Math.max(3, f);
  };
  const slicePath = (k) => {
    const a0 = ((k * slice - 90) * Math.PI) / 180;
    const a1 = (((k + 1) * slice - 90) * Math.PI) / 180;
    const large = slice > 180 ? 1 : 0;
    return `M0 0 L${R * Math.cos(a0)} ${R * Math.sin(a0)} A${R} ${R} 0 ${large} 1 ${R * Math.cos(a1)} ${R * Math.sin(a1)} Z`;
  };

  return (
    <div className={`wheel-wrap ${spinning ? "spinning" : ""}`}>
      <div className="wheel-pointer" aria-hidden="true" />
      <svg viewBox="-210 -210 420 420" className="wheel" role="img" aria-label={`Prize wheel with ${entries.length} guests`}>
        <g style={{ transform: `rotate(${rotation}deg)`, transition: spinning ? `transform ${spinMs}ms cubic-bezier(0.12, 0.7, 0.1, 1)` : "none" }}>
          {entries.length === 0 ? (
            <circle r={R} fill="#163a6b" />
          ) : entries.length === 1 ? (
            <circle r={R} fill={COLORS[0]} />
          ) : (
            entries.map((e, k) => <path key={e.ticketNo} d={slicePath(k)} fill={COLORS[k % COLORS.length]} stroke="#061328" strokeWidth={n > 60 ? 0.3 : 1} />)
          )}
          {entries.map((e, k) => {
              const angle = (k + 0.5) * slice - 90;
              const fill = DARK_TEXT.has(COLORS[k % COLORS.length]) && entries.length > 1 ? "#0b1d3a" : "#f7fbff";
              const label = e.name;
              return (
                <text
                  key={e.ticketNo}
                  transform={`rotate(${angle}) translate(${R - 12} 0)`}
                  textAnchor="end"
                  dominantBaseline="central"
                  fontSize={fontFor(label)}
                  fill={fill}
                  fontFamily="system-ui, sans-serif"
                  fontWeight="600"
                >
                  {label}
                </text>
              );
            })}
        </g>
        <circle r={HUB} fill="#061328" stroke="#f6d98b" strokeWidth="4" />
        <text textAnchor="middle" dominantBaseline="central" fontSize="30">
          ❄️
        </text>
      </svg>
    </div>
  );
}
