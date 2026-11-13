"use client";

import { useState } from "react";
import { fetchLive, setLiveGame } from "@/lib/store";
import { usePolling } from "@/lib/hooks";
import { GAMES } from "@/lib/games";

// Which game guests see on their Games tab. Starting a game switches this automatically.
export default function LiveSwitch() {
  const { data, setData } = usePolling(fetchLive, () => 3000);
  const [busy, setBusy] = useState(false);
  const live = data?.game ?? null;

  async function choose(game) {
    setBusy(true);
    try {
      setData(await setLiveGame(game));
    } catch {
      /* keep the old value; the next poll corrects it */
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="live-switch">
      <span className="live-switch-label">📱 Guests’ Games tab shows:</span>
      <div className="live-options">
        <button className={`live-opt ${live === null ? "active" : ""}`} onClick={() => choose(null)} disabled={busy}>
          Nothing
        </button>
        {GAMES.map((g) => (
          <button key={g.id} className={`live-opt ${live === g.id ? "active" : ""}`} onClick={() => choose(g.id)} disabled={busy}>
            {live === g.id && <span className="live-dot" aria-hidden="true" />} {g.icon} {g.label}
          </button>
        ))}
      </div>
    </div>
  );
}
