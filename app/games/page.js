"use client";

import { useState } from "react";
import TeacupShuffle from "@/components/TeacupShuffle";
import RiddleQuiz from "@/components/RiddleQuiz";

const GAMES = [
  { id: "teacups", label: "Teacup Shuffle", icon: "🫖", blurb: "Keep your eye on the Dormouse as the Hatter shuffles the cups." },
  { id: "riddles", label: "Hatter’s Riddles", icon: "🎩", blurb: "How well do you know Wonderland? Answer before the tea goes cold." },
];

export default function GamesPage() {
  const [active, setActive] = useState(GAMES[0].id);
  const game = GAMES.find((g) => g.id === active);

  return (
    <div className="stack">
      <div className="subtabs" role="tablist">
        {GAMES.map((g) => (
          <button
            key={g.id}
            role="tab"
            aria-selected={active === g.id}
            className={`subtab ${active === g.id ? "active" : ""}`}
            onClick={() => setActive(g.id)}
          >
            <span aria-hidden="true">{g.icon}</span> {g.label}
          </button>
        ))}
      </div>
      <section className="panel">
        <h2 className="panel-title">
          <span aria-hidden="true">{game.icon}</span> {game.label}
        </h2>
        <p className="muted">{game.blurb}</p>
        {active === "teacups" ? <TeacupShuffle /> : <RiddleQuiz />}
      </section>
    </div>
  );
}
