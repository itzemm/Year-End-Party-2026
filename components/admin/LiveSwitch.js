"use client";

import { fetchLive } from "@/lib/store";
import { usePolling } from "@/lib/hooks";
import { gameById } from "@/lib/games";

export function useLive() {
  return usePolling(fetchLive, () => 3000).data;
}

// If a different game is still in progress, its name (so this one can't start yet).
export function useOtherGameRunning(gameId) {
  const live = useLive();
  return live?.game && live.game !== gameId && live.inProgress ? gameById(live.game).label : null;
}

export function OtherGameNotice({ name }) {
  if (!name) return null;
  return <p className="note error-text screen-hide">{name} is still running — stop it before starting this game.</p>;
}

// Shows which game guests currently see. It follows the admin automatically:
// starting a game shows it; stopping/resetting it clears guests' screens.
export default function LiveSwitch() {
  const live = useLive();
  const game = live?.game ? gameById(live.game) : null;
  return (
    <div className="live-switch">
      <span className="live-switch-label">📱 Guests’ Games tab:</span>
      {game ? (
        <span className="live-opt active">
          <span className="live-dot" aria-hidden="true" /> {game.icon} {game.label}
          {live.inProgress ? " — in progress" : " — finished (results showing)"}
        </span>
      ) : (
        <span className="muted">No games currently — start a game below and it appears on everyone’s phone.</span>
      )}
    </div>
  );
}
