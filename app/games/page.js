"use client";

import { useEffect, useState } from "react";
import ZoomGuess from "@/components/ZoomGuess";
import SmallestUnique from "@/components/SmallestUnique";

const GAMES = [
  {
    id: "zoom",
    label: "Guess the Item",
    icon: "🔍",
    blurb: "We start on an extreme close-up and zoom out one clue at a time. Shout out what it is — the earlier you guess, the more points!",
  },
  {
    id: "sun",
    label: "Smallest Unique Number",
    icon: "🔢",
    blurb: "Everyone picks a number on their phone. The lowest number that nobody else chose wins the round.",
  },
];

export default function GamesPage() {
  const [active, setActive] = useState(GAMES[0].id);

  // Allow links like /games?game=sun (used by the join QR code).
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("game");
    if (GAMES.some((g) => g.id === wanted)) setActive(wanted);
  }, []);

  function choose(id) {
    setActive(id);
    const url = new URL(window.location.href);
    url.searchParams.set("game", id);
    window.history.replaceState(null, "", url);
  }

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
            onClick={() => choose(g.id)}
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
        {active === "zoom" ? <ZoomGuess /> : <SmallestUnique />}
      </section>
    </div>
  );
}
