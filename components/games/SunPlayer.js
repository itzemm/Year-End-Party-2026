"use client";

import { useEffect, useState } from "react";
import LoginPrompt from "./LoginPrompt";
import { Confetti } from "@/components/Confetti";
import { fetchSun, fetchSunMe, submitSun } from "@/lib/store";
import { usePolling, useServerNow } from "@/lib/hooks";
import { SUN_MAX } from "@/lib/rules";

const mmss = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

// What guests see on their phones during Smallest Unique Number.
export default function SunPlayer() {
  const { data, error, refresh } = usePolling(fetchSun, (d) => (!d?.round ? 5000 : d.round.phase === "locked" ? 3000 : 2000));
  const round = data?.round;
  const now = useServerNow(250, round?.phase === "open");
  const phase = round ? (round.phase === "open" && now >= round.endsAt ? "locked" : round.phase) : null;

  const [me, setMe] = useState(null);
  useEffect(() => {
    fetchSunMe().then(setMe).catch(() => {});
  }, [round?.id, phase]);

  if (data === undefined) return <p className="muted center">Shaking the snow globe…</p>;
  if (me && !me.loggedIn) return <LoginPrompt next="/games?game=sun" />;
  if (!round) {
    return (
      <div className="panel-inner empty">
        <p className="big-emoji" aria-hidden="true">⛄</p>
        <p>Waiting for the host to start the round…</p>
      </div>
    );
  }
  const myEntry = me?.roundId === round.id ? me.entry : null;

  if (phase === "stopped") {
    return (
      <div className="panel-inner empty">
        <p className="big-emoji" aria-hidden="true">⏹️</p>
        <p>The host stopped this round. Stay on this page for the next one!</p>
      </div>
    );
  }

  if (phase === "open") {
    return (
      <div className="panel-inner">
        <h3 className="sun-heading">
          Pick a number 1–{SUN_MAX} <span className="live-dot" aria-hidden="true" />
        </h3>
        <p className={`big-timer ${round.endsAt - now < 15000 ? "urgent" : ""}`}>{mmss(round.endsAt - now)}</p>
        <p className="muted center">{me?.name ? `Playing as ${me.name}. ` : ""}You can change your number until the timer ends.</p>
        {myEntry && (
          <p className="my-pick">
            Your number: <b>{myEntry.n}</b>
          </p>
        )}
        <PickForm
          hasPick={!!myEntry}
          onSaved={(entry) => {
            setMe((m) => ({ ...m, roundId: round.id, entry }));
            refresh();
          }}
        />
        {error && <p className="note">{error}</p>}
      </div>
    );
  }

  if (phase === "locked") {
    return (
      <div className="panel-inner empty">
        <p className="big-emoji" aria-hidden="true">🔒</p>
        <h3 className="sun-heading">Time’s up — numbers are locked!</h3>
        {myEntry ? (
          <p className="my-pick">
            Your number: <b>{myEntry.n}</b>
          </p>
        ) : (
          <p>You didn’t pick a number this round.</p>
        )}
        <p className="muted">Watch the big screen — the chests are about to be opened.</p>
      </div>
    );
  }

  // Revealing: guests only see their own number and how it's doing.
  const opened = round.opened || {};
  const st = round.standings;
  const myN = myEntry?.n;
  const mine = myN != null ? opened[myN] : undefined;
  const iWon = myN != null && st?.winner?.n === myN;
  let outcome;
  if (myN == null) outcome = "You didn’t pick a number this round — enjoy the show!";
  else if (iWon) outcome = "🎉 You won — nobody else picked your number, and it’s the smallest!";
  else if (mine === undefined) outcome = "Your chest hasn’t been opened yet…";
  else if (mine.length > 1) outcome = `${mine.length - 1} other guest${mine.length === 2 ? "" : "s"} picked ${myN} too.`;
  else if (st?.winner) outcome = `Nobody else picked ${myN} — but ${st.winner.n} was smaller.`;
  else outcome = `Nobody else picked ${myN}! Waiting to see if a smaller number is unique…`;

  return (
    <div className={`panel-inner sun-mine ${iWon ? "won" : ""}`}>
      {iWon && <Confetti />}
      {myN != null && (
        <>
          <p className="muted">Your number</p>
          <p className="sun-mine-n">{myN}</p>
        </>
      )}
      <p className={`my-outcome ${iWon ? "won" : ""}`}>{outcome}</p>
      {st?.winner && !iWon && (
        <p className="muted center">
          Winner: <b>{st.winner.name}</b> with {st.winner.n}
        </p>
      )}
      {st?.noWinner && <p className="muted center">No unique number this round — nobody wins!</p>}
    </div>
  );
}

function PickForm({ hasPick, onSaved }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1 || n > SUN_MAX) {
      setError(`Pick a whole number from 1 to ${SUN_MAX}.`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { entry } = await submitSun(n);
      onSaved(entry);
      setValue("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form className="sun-form" onSubmit={submit}>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={SUN_MAX}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`1–${SUN_MAX}`}
          aria-label="Your number"
          required
        />
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? "Sending…" : hasPick ? "Change my number" : "Lock it in"}
        </button>
      </form>
      {error && <p className="note error-text center">{error}</p>}
    </>
  );
}
