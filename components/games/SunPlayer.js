"use client";

import { useEffect, useState } from "react";
import ChestGrid from "./ChestGrid";
import LoginPrompt from "./LoginPrompt";
import { SunBanner } from "@/components/admin/SunAdmin";
import { fetchSun, fetchSunMe, submitSun } from "@/lib/store";
import { usePolling, useServerNow } from "@/lib/hooks";
import { SUN_MAX, SUN_PAGES } from "@/lib/rules";

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

  // Revealing: follow along with the chests the host opens.
  const opened = round.opened || {};
  const st = round.standings;
  const myN = myEntry?.n;
  const mine = myN != null ? opened[myN] : undefined;
  let outcome = null;
  if (myN != null) {
    if (st?.winner?.n === myN) outcome = "🎉 You won — yours was the smallest unique number!";
    else if (mine === undefined) outcome = `Your chest (${myN}) hasn’t been opened yet…`;
    else if (mine.length > 1) outcome = `Chest ${myN} is open: ${mine.length - 1} other guest${mine.length === 2 ? "" : "s"} also picked it.`;
    else if (st?.current?.n === myN) outcome = `Chest ${myN} is open and you’re the only one in it — you’re in the lead!`;
    else outcome = `Chest ${myN} is open and you’re the only one in it — but ${st?.current?.n} is smaller.`;
  }
  return (
    <div className="panel-inner">
      <SunBanner standings={st} big={false} />
      {myN != null ? (
        <p className={`my-outcome ${st?.winner?.n === myN ? "won" : ""}`}>
          Your number: <b>{myN}</b>. {outcome}
        </p>
      ) : (
        <p className="my-outcome">You didn’t play this round — enjoy the show!</p>
      )}
      {SUN_PAGES.map((nums, i) => (
        <div key={i} className="mini-page">
          <p className="muted small-print">
            Chests {nums[0]} → {nums[nums.length - 1]}
          </p>
          <ChestGrid numbers={nums} opened={opened} current={st?.current} winner={st?.winner} myN={myN} compact />
        </div>
      ))}
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
