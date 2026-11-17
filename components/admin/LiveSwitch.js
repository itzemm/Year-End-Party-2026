"use client";

import { useState } from "react";
import { fetchLive, setLiveGame } from "@/lib/store";
import { usePolling } from "@/lib/hooks";
import { GAMES, gameById } from "@/lib/games";

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

// Choose what guests' Games tab shows. Starting a game also switches it automatically,
// and stopping it switches back to Nothing.
export default function LiveSwitch() {
  const { data: live, setData } = usePolling(fetchLive, () => 3000);
  const [busy, setBusy] = useState(false);
  const current = live?.game ?? null;

  async function choose(game) {
    setBusy(true);
    try {
      setData(await setLiveGame(game));
    } catch {
      /* the next poll shows the real state */
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="live-switch">
      <span className="live-switch-label">📱 Guests’ Games tab shows:</span>
      <div className="live-options">
        <button className={`live-opt ${current === null ? "active" : ""}`} onClick={() => choose(null)} disabled={busy}>
          {current === null && <span className="live-dot" aria-hidden="true" />} Nothing
        </button>
        {GAMES.map((g) => (
          <button key={g.id} className={`live-opt ${current === g.id ? "active" : ""}`} onClick={() => choose(g.id)} disabled={busy}>
            {current === g.id && <span className="live-dot" aria-hidden="true" />} {g.icon} {g.label}
          </button>
        ))}
      </div>
      {current && live?.inProgress && <span className="muted small-print">in progress</span>}
    </div>
  );
}
