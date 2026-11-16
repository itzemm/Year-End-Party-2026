"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PrizeWheel from "./PrizeWheel";
import { BigScreenButton, useBigScreen } from "./useBigScreen";
import { Confetti } from "@/components/Confetti";
import { clearWinners, drawWinner, fetchWheelNames, fetchWinners } from "@/lib/store";

// Lucky draw: a wheel of every registered guest's name. Spin → one winner.
export default function LuckyAdmin() {
  const [guests, setGuests] = useState([]);
  const [winners, setWinners] = useState([]);
  const [allowRepeat, setAllowRepeat] = useState(false);
  const [spin, setSpin] = useState(null); // { pool, winner, spinMs, key }
  const [revealed, setRevealed] = useState(null);
  const [error, setError] = useState("");
  const big = useBigScreen();

  const load = useCallback(async () => {
    try {
      const [g, w] = await Promise.all([fetchWheelNames(), fetchWinners()]);
      setGuests(g);
      setWinners(w);
    } catch (e) {
      setError(e.message);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const won = new Set(winners.map((w) => w.ticketNo));
  const eligible = allowRepeat ? guests : guests.filter((g) => !won.has(g.ticketNo));
  const wheelEntries = spin ? spin.pool : eligible.map((g) => ({ ticketNo: g.ticketNo, name: g.name }));
  const spinning = Boolean(spin && !revealed);
  const target = useMemo(() => (spin ? { ...spin.winner, key: spin.key } : null), [spin]);

  async function draw() {
    setError("");
    setRevealed(null);
    try {
      const res = await drawWinner(allowRepeat);
      setSpin({ pool: res.pool, winner: res.winner, spinMs: res.spinMs, key: Date.now() });
    } catch (e) {
      setError(e.message);
    }
  }

  async function clearAll() {
    if (!confirm("Clear all lucky draw winners? Everyone goes back on the wheel.")) return;
    await clearWinners().catch((e) => setError(e.message));
    setSpin(null);
    setRevealed(null);
    load();
  }

  return (
    <div className="stack">
      <section className="panel host-screen lucky-stage" ref={big.outerRef}>
        {revealed && <Confetti key={revealed.id} />}
        <div {...big.innerProps}>
          <div className="panel-head">
            <h2 className="panel-title">🎁 Lucky Draw</h2>
            <BigScreenButton big={big} />
          </div>
          <div className="lucky-solo">
            <PrizeWheel
              entries={wheelEntries}
              target={target}
              spinMs={spin?.spinMs || 9000}
              onStopped={() => {
                setRevealed(spin?.winner);
                load();
              }}
            />
            {revealed ? (
              <div className="winner-card big">
                <small>And the winner is…</small>
                <b>{revealed.name}</b>
                <span className="mono">{revealed.ticketNo}</span>
              </div>
            ) : (
              <p className="host-lead center">{spinning ? "Spinning…" : `${eligible.length} names on the wheel`}</p>
            )}
            <div className="actions">
              <button className="btn primary big" onClick={draw} disabled={spinning || wheelEntries.length === 0}>
                {spinning ? "Spinning…" : revealed ? "Spin again" : "Spin the wheel!"}
              </button>
            </div>
            <label className="check center-text screen-hide">
              <input type="checkbox" checked={allowRepeat} onChange={(e) => setAllowRepeat(e.target.checked)} disabled={spinning} />
              Let previous winners win again
            </label>
          </div>
          {error && <p className="note error-text center">{error}</p>}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">
            🏆 Winners <span className="count">{winners.length}</span>
          </h2>
          {winners.length > 0 && (
            <button className="btn small ghost" onClick={clearAll} disabled={spinning}>
              Clear winners
            </button>
          )}
        </div>
        {winners.length === 0 ? (
          <p className="muted">No winners yet.</p>
        ) : (
          <ol className="winners-list">
            {winners.map((w) => (
              <li key={w.id}>
                <b>{w.name}</b> <span className="mono muted">{w.ticketNo}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
