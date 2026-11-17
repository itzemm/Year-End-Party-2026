"use client";

import { useState } from "react";
import ChestGrid, { ChestIcon } from "@/components/games/ChestGrid";
import JoinQr from "./JoinQr";
import { OtherGameNotice, useOtherGameRunning } from "./LiveSwitch";
import GameRules from "@/components/games/GameRules";
import { BigScreenButton, useBigScreen } from "./useBigScreen";
import { fetchSun, sunAdmin } from "@/lib/store";
import { usePolling, useServerNow } from "@/lib/hooks";
import { SUN_MAX } from "@/lib/rules";

const mmss = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export default function SunAdmin() {
  const { data, refresh, setData } = usePolling(fetchSun, (d) => (d?.round && d.round.phase !== "locked" ? 1500 : 4000));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [popup, setPopup] = useState(null); // chest number being shown
  const big = useBigScreen();
  const otherGame = useOtherGameRunning("sun");
  const round = data?.round;
  const now = useServerNow(250, round?.phase === "open" || round?.phase === "locked");
  const phase = round ? (round.phase === "open" && now >= round.endsAt ? "locked" : round.phase) : null;

  async function act(action, extra) {
    if (action === "start" && (phase === "open" || phase === "revealing") && !confirm("Start a new round? The current one will be abandoned.")) return;
    if (action === "stop" && !confirm("Stop this round? Picks are locked and no winner is declared.")) return;
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

  // Click a lit chest: it opens (fast) and its names pop up. Click outside to close.
  async function open(n) {
    setPopup(n);
    if (!(n in (round.opened || {}))) await act("open", { n });
  }

  if (data === undefined) return <section className="panel">Loading…</section>;
  const opened = round?.opened || {};
  const st = round?.standings;
  const popupNames = popup != null ? opened[popup] : undefined;

  return (
    <section className="panel host-screen" ref={big.outerRef}>
      <div {...big.innerProps}>
        <div className="panel-head">
          <h2 className="panel-title">🔢 Smallest Unique Number</h2>
          <div className="actions">
            <BigScreenButton big={big} />
            {round && phase !== "stopped" && (
              <button className="btn small danger-btn screen-hide" onClick={() => act("stop")} disabled={busy}>
                ■ Stop round
              </button>
            )}
            {round && phase !== "open" && phase !== "stopped" && (
              <button className="btn small ghost screen-hide" onClick={() => act("start")} disabled={busy}>
                New round
              </button>
            )}
          </div>
        </div>

        {(!round || phase === "stopped") && (
          <div className="host-rules">
            <GameRules game="sun" big />
            <div className="host-rules-side">
              <JoinQr path="/games" label="Scan to play" />
              <OtherGameNotice name={otherGame} />
              <button className="btn primary big" onClick={() => act("start")} disabled={busy || Boolean(otherGame)}>
                Start 1-minute round
              </button>
            </div>
          </div>
        )}

        {(phase === "open" || phase === "locked") && (
          <div className="host-idle">
            <JoinQr path="/games" label="Scan to play" />
            <div className="host-status">
              {phase === "open" && (
                <>
                  <p className="eyebrow">Pick a number 1–{SUN_MAX}</p>
                  <p className={`host-count ${round.endsAt - now < 10000 ? "urgent" : ""}`}>{mmss(round.endsAt - now)}</p>
                  <p className="host-lead">{round.entryCount} guests have locked in</p>
                  <button className="btn small ghost screen-hide" onClick={() => act("endNow")} disabled={busy}>
                    Everyone’s in — lock numbers now
                  </button>
                </>
              )}
              {phase === "locked" && (
                <>
                  <p className="host-count">Time’s up!</p>
                  <p className="host-lead">{round.entryCount ?? "…"} guests picked a number</p>
                  <button className="btn primary big" onClick={() => act("reveal")} disabled={busy || now < round.endsAt + 1200}>
                    Light up the chests
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {phase === "revealing" && (
          <div className="host-play">
            <SunBanner standings={st} />
            <ChestGrid picked={round.picked} opened={opened} onOpen={open} current={st?.current} winner={st?.winner} />
            <p className="muted center screen-hide">
              {round.total} guests played · {round.picked.length} numbers were picked (lit chests) · click a chest to open it
            </p>
          </div>
        )}
        {error && <p className="note error-text center">{error}</p>}
      </div>

      {popup != null && (
        <div className="chest-popup-backdrop" onClick={() => setPopup(null)}>
          <div className="chest-popup" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Chest ${popup}`}>
            <div className="chest-popup-lid">
              <ChestIcon open />
            </div>
            <p className="chest-popup-n">{popup}</p>
            {popupNames === undefined ? (
              <p className="muted">Opening…</p>
            ) : (
              <>
                <p className="chest-popup-count">
                  {popupNames.length === 1 ? "Only one person picked this!" : `${popupNames.length} people picked this`}
                </p>
                <ul className={`chest-popup-names ${popupNames.length === 1 ? "unique" : ""}`}>
                  {popupNames.map((name, i) => (
                    <li key={i} style={{ animationDelay: `${0.08 + i * 0.04}s` }}>
                      {name}
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p className="muted small-print">Click outside to go back to the chests</p>
          </div>
        </div>
      )}
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
