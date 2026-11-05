"use client";

import { useRef, useState } from "react";
import { addWinner, clearWinners } from "@/lib/store";
import { useStore } from "@/lib/useStore";
import { characterFor } from "@/lib/characters";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function fairIndex(n) {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % n;
}

export default function LuckyDrawPage() {
  const { guests, winners, ready } = useStore();
  const [prize, setPrize] = useState("");
  const [allowRepeat, setAllowRepeat] = useState(false);
  const [display, setDisplay] = useState(null);
  const [winner, setWinner] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const stageRef = useRef(null);

  const wonTickets = new Set(winners.map((w) => w.ticketNo));
  const pool = allowRepeat ? guests : guests.filter((g) => !wonTickets.has(g.ticketNo));

  async function draw() {
    if (spinning || pool.length === 0) return;
    setSpinning(true);
    setWinner(null);
    const chosen = pool[fairIndex(pool.length)];

    // Roll through random tickets, slowing down like a stopping pocket watch.
    const steps = 32;
    for (let i = 0; i < steps; i++) {
      setDisplay(pool[Math.floor(Math.random() * pool.length)]);
      await wait(40 + Math.pow(i / steps, 3) * 380);
    }
    setDisplay(chosen);
    await wait(350);

    const record = {
      ticketNo: chosen.ticketNo,
      name: chosen.name,
      team: chosen.team,
      character: chosen.character,
      prize: prize.trim() || `Prize #${winners.length + 1}`,
      drawnAt: new Date().toISOString(),
    };
    addWinner(record);
    setWinner(record);
    setSpinning(false);
  }

  function toggleFullscreen() {
    const el = stageRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  }

  const shown = display ? characterFor(display.character) : null;

  return (
    <div className="stack">
      <section className="panel draw-stage" ref={stageRef}>
        {winner && <Confetti key={winner.drawnAt} />}
        <div className="panel-head">
          <h2 className="panel-title">
            <span aria-hidden="true">🎩</span> The Queen’s Lucky Draw
          </h2>
          <button className="btn small ghost" onClick={toggleFullscreen}>
            ⛶ Big screen
          </button>
        </div>

        <div className="draw-controls">
          <label>
            Prize
            <input value={prize} onChange={(e) => setPrize(e.target.value)} placeholder="e.g. A golden pocket watch" disabled={spinning} />
          </label>
          <label className="check">
            <input type="checkbox" checked={allowRepeat} onChange={(e) => setAllowRepeat(e.target.checked)} disabled={spinning} />
            Allow previous winners to win again
          </label>
        </div>

        <div className={`draw-window ${spinning ? "spinning" : ""} ${winner ? "won" : ""}`}>
          {display ? (
            <>
              <p className="draw-suit" aria-hidden="true">{shown.suit}</p>
              <p className="draw-number">{display.ticketNo}</p>
              <p className="draw-name">{spinning ? "…" : display.name}</p>
              {winner && (
                <p className="draw-prize">
                  wins <b>{winner.prize}</b>!
                </p>
              )}
            </>
          ) : (
            <>
              <p className="draw-suit" aria-hidden="true">🕰️</p>
              <p className="draw-name">“Who will it be?” said the Cheshire Cat.</p>
            </>
          )}
        </div>

        <div className="draw-footer">
          <p className="muted">
            {ready && (
              <>
                {pool.length} ticket{pool.length === 1 ? "" : "s"} in the hat
                {guests.length === 0 && " — register guests first (or import a guest list)."}
              </>
            )}
          </p>
          <button className="btn primary big" onClick={draw} disabled={spinning || pool.length === 0}>
            {spinning ? "Shuffling the deck…" : "Draw a ticket!"}
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">
            <span aria-hidden="true">🏆</span> Winners’ Roll <span className="count">{winners.length}</span>
          </h2>
          {winners.length > 0 && (
            <button className="btn small ghost" onClick={() => confirm("Clear all winners?") && clearWinners()}>
              Clear
            </button>
          )}
        </div>
        {winners.length === 0 ? (
          <p className="muted">No winners yet. The Queen is growing impatient.</p>
        ) : (
          <ol className="winners">
            {winners
              .slice()
              .reverse()
              .map((w) => (
                <li key={w.drawnAt}>
                  <span className="mono">{w.ticketNo}</span>
                  <span className="w-name">{w.name}</span>
                  <span className="w-prize">{w.prize}</span>
                </li>
              ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.8,
    duration: 2.2 + Math.random() * 1.6,
    char: ["♠", "♥", "♣", "♦", "🌹", "🃏"][i % 6],
    rot: Math.random() * 360,
  }));
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{ left: `${p.left}%`, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s`, "--rot": `${p.rot}deg` }}
        >
          {p.char}
        </span>
      ))}
    </div>
  );
}
