"use client";

import { useEffect, useRef, useState } from "react";
import ChestGrid from "@/components/games/ChestGrid";
import JoinQr from "./JoinQr";
import { fetchSun, sunAdmin } from "@/lib/store";
import { usePolling, useServerNow } from "@/lib/hooks";
import { SUN_MAX, SUN_PAGES } from "@/lib/rules";

const mmss = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export default function SunAdmin() {
  const { data, refresh, setData } = usePolling(fetchSun, (d) => (d?.round && d.round.phase !== "locked" ? 1500 : 4000));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const stageRef = useRef(null);
  const round = data?.round;
  const now = useServerNow(250, round?.phase === "open" || round?.phase === "locked");
  const phase = round ? (round.phase === "open" && now >= round.endsAt ? "locked" : round.phase) : null;

  async function act(action, extra) {
    if (action === "start" && (phase === "open" || phase === "revealing") && !confirm("Start a new round? The current one will be abandoned.")) return;
    setBusy(true);
    setError("");
    try {
      setData(await sunAdmin(action, extra));
    } catch (e) {
      setError(e.message);
      refresh();
    } finally {
      setBusy(false);
    }
  }

  const page = round?.page ?? 0;
  const opened = round?.opened || {};
  const nextChest = phase === "revealing" ? SUN_PAGES[page].find((n) => !(n in opened)) : undefined;
  const st = round?.standings;
  const pageDone = nextChest === undefined;

  // Space / → opens the next chest (presenter clicker friendly).
  const openRef = useRef(null);
  openRef.current = phase === "revealing" && nextChest !== undefined && !busy ? () => act("open", { n: nextChest }) : null;
  useEffect(() => {
    const onKey = (e) => {
      if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
      if ((e.key === " " || e.key === "ArrowRight") && openRef.current) {
        e.preventDefault();
        openRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (data === undefined) return <section className="panel">Loading…</section>;

  return (
    <section className="panel host-screen" ref={stageRef}>
      <div className="panel-head">
        <h2 className="panel-title">🔢 Smallest Unique Number — host</h2>
        <div className="actions">
          <button className="btn small ghost" onClick={() => (document.fullscreenElement ? document.exitFullscreen() : stageRef.current?.requestFullscreen?.())}>
            ⛶ Big screen
          </button>
          {round && phase !== "open" && (
            <button className="btn small ghost" onClick={() => act("start")} disabled={busy}>
              New round
            </button>
          )}
        </div>
      </div>

      {(!round || phase === "open" || phase === "locked") && (
        <div className="host-idle">
          <JoinQr path="/games?game=sun" label="Scan to play" />
          <div className="host-status">
            {!round && (
              <>
                <p>Everyone gets 2 minutes to pick a number from 1 to {SUN_MAX}. The smallest number nobody else picked wins.</p>
                <button className="btn primary big" onClick={() => act("start")} disabled={busy}>
                  Start 2-minute round
                </button>
              </>
            )}
            {phase === "open" && (
              <>
                <p className="eyebrow">Round {round.id} · pick a number 1–{SUN_MAX}</p>
                <p className="host-count">{mmss(round.endsAt - now)}</p>
                <p className="muted">{round.entryCount} guests have picked</p>
              </>
            )}
            {phase === "locked" && (
              <>
                <p className="eyebrow">Round {round.id}</p>
                <p className="host-count">Time’s up!</p>
                <p className="muted">{round.entryCount ?? "…"} guests picked a number</p>
                <button className="btn primary big" onClick={() => act("reveal")} disabled={busy || now < round.endsAt + 1200}>
                  Start opening chests
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {phase === "revealing" && (
        <div className="host-play">
          <SunBanner standings={st} />
          <div className="subtabs">
            {SUN_PAGES.map((nums, i) => (
              <button key={i} className={`subtab ${page === i ? "active" : ""}`} onClick={() => act("page", { page: i })} disabled={busy || page === i}>
                Chests {nums[0]} → {nums[nums.length - 1]}
              </button>
            ))}
          </div>
          <ChestGrid
            numbers={SUN_PAGES[page]}
            opened={opened}
            nextChest={nextChest}
            onOpen={(n) => act("open", { n })}
            current={st?.current}
            winner={st?.winner}
          />
          <div className="actions">
            {!pageDone && (
              <button className="btn primary" onClick={() => act("open", { n: nextChest })} disabled={busy}>
                Open chest {nextChest}
              </button>
            )}
            {pageDone && page === 0 && !st?.winner && (
              <button className="btn primary big" onClick={() => act("page", { page: 1 })} disabled={busy}>
                No unique number in 1–50 · Next page: 51 → 100 →
              </button>
            )}
          </div>
          <p className="muted small-print center">
            {round.total} guests played · Space or → opens the next chest
          </p>
        </div>
      )}
      {error && <p className="note error-text center">{error}</p>}
    </section>
  );
}

export function SunBanner({ standings, big = true }) {
  const { current, winner, noWinner } = standings || {};
  return (
    <div className={`sun-banner ${winner ? "decided" : ""} ${big ? "big" : ""}`}>
      {winner ? (
        <>
          <span className="sun-winner-n">{winner.n}</span>
          <div>
            <small>Winner — smallest unique number</small>
            <b>{winner.name}</b> 🎉
          </div>
        </>
      ) : noWinner ? (
        <div>
          <b>No unique number this round — nobody wins!</b>
        </div>
      ) : current ? (
        <>
          <span className="sun-winner-n">{current.n}</span>
          <div>
            <small>Current smallest unique number</small>
            <b>{current.name}</b>
          </div>
        </>
      ) : (
        <div>
          <small>Current smallest unique number</small>
          <b>None yet…</b>
        </div>
      )}
    </div>
  );
}
