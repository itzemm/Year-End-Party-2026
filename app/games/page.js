"use client";

import ZoomPlayer from "@/components/games/ZoomPlayer";
import SunPlayer from "@/components/games/SunPlayer";
import TelPlayer from "@/components/games/TelPlayer";
import StagePlayer from "@/components/games/StagePlayer";
import { fetchLive } from "@/lib/store";
import { usePolling } from "@/lib/hooks";
import { gameById } from "@/lib/games";

const PLAYERS = { zoom: ZoomPlayer, sun: SunPlayer, tel: TelPlayer, stage: StagePlayer };

// Guests only see the game the host has put live; it switches automatically.
export default function GamesPage() {
  const { data } = usePolling(fetchLive, () => 3000);
  if (data === undefined) return <p className="muted center">Shaking the snow globe…</p>;
  const game = gameById(data.game);

  if (!game) {
    return (
      <section className="panel empty">
        <p className="big-emoji" aria-hidden="true">🎮</p>
        <h2 className="panel-title">No game right now</h2>
        <p className="muted">Keep this page open — the next game will appear here as soon as the host starts it.</p>
      </section>
    );
  }

  const Player = PLAYERS[game.id];
  return (
    <section className="panel">
      <p className="eyebrow live-label">
        <span className="live-dot" aria-hidden="true" /> Now playing
      </p>
      <h2 className="panel-title">
        <span aria-hidden="true">{game.icon}</span> {game.label}
      </h2>
      <p className="muted">{game.blurb}</p>
      <Player key={game.id} />
    </section>
  );
}
