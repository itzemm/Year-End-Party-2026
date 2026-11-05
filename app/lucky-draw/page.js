"use client";

import { useRef, useState } from "react";
import { clearWinners, drawWinner, notifyChange } from "@/lib/store";
import { useStore } from "@/lib/useStore";
import { PasscodeGate, StorageNotice } from "@/components/AdminGate";
import { characterFor } from "@/lib/characters";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export default function LuckyDrawPage() {
  const { guests, winners, ready, status, error, needsPasscode } = useStore();
  const [prize, setPrize] = useState("");
  const [allowRepeat, setAllowRepeat] = useState(false);
  const [display, setDisplay] = useState(null);
  const [winner, setWinner] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [drawError, setDrawError] = useState("");
  const [pendingAt, setPendingAt] = useState(null);
  const stageRef = useRef(null);

  const wonTickets = new Set(winners.map((w) => w.ticketNo));
  const pool = allowRepeat ? guests : guests.filter((g) => !wonTickets.has(g.ticketNo));

  async function draw() {
    if (spinning || pool.length === 0) return;
    setSpinning(true);
    setWinner(null);
    setDrawError("");

    // The server picks the winner (so every screen agrees), then we put on a show.
    let result;
    try {
      result = await drawWinner(prize.trim(), allowRepeat);
    } catch (err) {
      setDrawError(err.message);
      setSpinning(false);
      return;
    }
    const { winner: record, pool: names } = result;
    setPendingAt(record.drawnAt);

    // Roll through random tickets, slowing down like a stopping pocket watch.
    const steps = 32;
    for (let i = 0; i < steps; i++) {
      setDisplay(names[Math.floor(Math.random() * names.length)]);
      await wait(40 + Math.pow(i / steps, 3) * 380);
    }
    setDisplay(record);
    await wait(350);

    setWinner(record);
    setPendingAt(null);
    setSpinning(false);
    notifyChange();
  }

  function toggleFullscreen() {
    const el = stageRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  }

  const shown = display ? characterFor(display.character) : null;

  if (needsPasscode) return <PasscodeGate />;

  // While the show is running, hide the newest winner from the roll so it isn't spoiled.
  const roll = pendingAt ? winners.filter((w) => w.drawnAt !== pendingAt) : winners;

  return (
    <div className="stack">
      <StorageNotice status={status} error={error} />
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
          {drawError && <p className="note error-text">{drawError}</p>}
          <button className="btn primary big" onClick={draw} disabled={spinning || pool.length === 0}>
            {spinning ? "Shuffling the deck…" : "Draw a ticket!"}
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">
            <span aria-hidden="true">🏆</span> Winners’ Roll <span className="count">{roll.length}</span>
          </h2>
          {roll.length > 0 && !spinning && (
            <button className="btn small ghost" onClick={() => confirm("Clear all winners for everyone?") && clearWinners().catch((e) => setDrawError(e.message))}>
              Clear
            </button>
          )}
        </div>
        {roll.length === 0 ? (
          <p className="muted">No winners yet. The Queen is growing impatient.</p>
        ) : (
          <ol className="winners">
            {roll
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
