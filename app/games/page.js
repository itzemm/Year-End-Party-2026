"use client";

import { useEffect, useState } from "react";
import ZoomPlayer from "@/components/games/ZoomPlayer";
import SunPlayer from "@/components/games/SunPlayer";
import TelPlayer from "@/components/games/TelPlayer";

const GAMES = [
  {
    id: "zoom",
    label: "Guess the Item",
    icon: "🔍",
    blurb: "A mystery picture zooms out every 10 seconds. Type what it is — 5 pictures, and the most correct answers in the fastest time wins.",
  },
  {
    id: "sun",
    label: "Smallest Unique Number",
    icon: "🔢",
    blurb: "You have 2 minutes to pick a number from 1 to 100. The smallest number that nobody else picked wins!",
  },
  {
    id: "tel",
    label: "Broken Telephone",
    icon: "📞",
    blurb: "Three teams pass a secret sentence along as drawings — one person at a time. Watch it fall apart, then see the big reveal!",
  },
];

export default function GamesPage() {
  const [active, setActive] = useState(GAMES[0].id);

  // Links like /games?game=sun (used by the join QR codes) open that game.
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
          <button key={g.id} role="tab" aria-selected={active === g.id} className={`subtab ${active === g.id ? "active" : ""}`} onClick={() => choose(g.id)}>
            <span aria-hidden="true">{g.icon}</span> {g.label}
          </button>
        ))}
      </div>
      <section className="panel">
        <h2 className="panel-title">
          <span aria-hidden="true">{game.icon}</span> {game.label}
        </h2>
        <p className="muted">{game.blurb}</p>
        {active === "zoom" ? <ZoomPlayer /> : active === "sun" ? <SunPlayer /> : <TelPlayer />}
      </section>
    </div>
  );
}
