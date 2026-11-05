"use client";

import { useRef, useState } from "react";

const CUP_COUNT = 3;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function freshCups() {
  return Array.from({ length: CUP_COUNT }, (_, i) => ({ id: i, slot: i }));
}

export default function TeacupShuffle() {
  const [cups, setCups] = useState(freshCups);
  const [mouseCup, setMouseCup] = useState(1);
  const [phase, setPhase] = useState("ready"); // ready | peek | shuffling | guess | result
  const [lifted, setLifted] = useState(null);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [message, setMessage] = useState("Press “Pour the tea” to begin.");
  const running = useRef(false);

  async function play() {
    if (running.current) return;
    running.current = true;
    const target = Math.floor(Math.random() * CUP_COUNT);
    setMouseCup(target);
    setLifted(target);
    setPhase("peek");
    setMessage("The Dormouse is napping under this cup…");
    await wait(1200);
    setLifted(null);
    await wait(400);

    setPhase("shuffling");
    setMessage("Change places! Change places!");
    const swaps = 6 + streak * 2;
    const speed = Math.max(170, 420 - streak * 40);
    let current = cups.map((c) => ({ ...c }));
    for (let i = 0; i < swaps; i++) {
      const a = Math.floor(Math.random() * CUP_COUNT);
      let b = Math.floor(Math.random() * (CUP_COUNT - 1));
      if (b >= a) b++;
      current = current.map((c) => (c.slot === a ? { ...c, slot: b } : c.slot === b ? { ...c, slot: a } : c));
      setCups(current);
      await wait(speed);
    }
    setPhase("guess");
    setMessage("Where is the Dormouse?");
    running.current = false;
  }

  function guess(cupId) {
    if (phase !== "guess") return;
    setLifted(cupId);
    setPhase("result");
    if (cupId === mouseCup) {
      const s = streak + 1;
      setStreak(s);
      setBest((b) => Math.max(b, s));
      setMessage(`Splendid! Streak: ${s}. The Hatter will shuffle faster now…`);
    } else {
      setStreak(0);
      setMessage("Off with your head! The Dormouse was elsewhere.");
      setTimeout(() => setLifted((l) => (l === cupId ? mouseCup : l)), 700);
    }
  }

  const slotPct = (slot) => `${slot * 100}%`;

  return (
    <div className="teacup-game">
      <div className="scoreboard">
        <span>
          Streak <b>{streak}</b>
        </span>
        <span>
          Best <b>{best}</b>
        </span>
      </div>

      <div className="cup-table">
        {cups.map((cup) => (
          <button
            key={cup.id}
            className={`cup ${lifted === cup.id ? "lifted" : ""} ${phase === "guess" ? "clickable" : ""}`}
            style={{ transform: `translateX(${slotPct(cup.slot)})`, transitionDuration: phase === "shuffling" ? "0.25s" : "0.4s" }}
            onClick={() => guess(cup.id)}
            disabled={phase !== "guess"}
            aria-label={`Teacup ${cup.slot + 1}`}
          >
            <span className="mouse" aria-hidden="true" style={{ visibility: cup.id === mouseCup ? "visible" : "hidden" }}>
              🐭
            </span>
            <span className="cup-body" aria-hidden="true">
              <svg viewBox="0 0 100 80" width="100%">
                <path d="M10 8 h70 l-6 46 a18 18 0 0 1 -18 16 h-22 a18 18 0 0 1 -18 -16z" fill="var(--cream)" stroke="var(--gold)" strokeWidth="3" />
                <path d="M80 16 q16 2 14 16 q-2 12 -18 12" fill="none" stroke="var(--gold)" strokeWidth="4" />
                <text x="45" y="44" textAnchor="middle" fontSize="22" fill="var(--rose)">♥</text>
                <rect x="4" y="2" width="82" height="8" rx="4" fill="var(--gold)" />
              </svg>
            </span>
          </button>
        ))}
      </div>

      <p className="game-message">{message}</p>
      <button className="btn primary" onClick={play} disabled={phase === "peek" || phase === "shuffling"}>
        {phase === "ready" ? "Pour the tea" : phase === "result" ? "Another cup?" : "Shuffling…"}
      </button>
    </div>
  );
}
