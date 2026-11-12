"use client";

import { useEffect, useState } from "react";
import ZoomStage from "./ZoomStage";
import Leaderboard, { fmtTime } from "./Leaderboard";
import LoginPrompt from "./LoginPrompt";
import { fetchZoom, fetchZoomMe, submitZoomAnswer } from "@/lib/store";
import { usePolling, useServerNow } from "@/lib/hooks";
import { ZOOM_LOCK_MS, zoomPhase } from "@/lib/rules";

// What guests see on their phones during Guess the Item.
export default function ZoomPlayer() {
  const { data: game, error } = usePolling(fetchZoom, (g) => (g?.status === "idle" ? 5000 : 2500));
  const playing = game?.status === "playing";
  const now = useServerNow(250, playing);
  const phase = playing ? zoomPhase(now - game.startedAt) : null;
  const locked = !playing || phase.locked;

  const [me, setMe] = useState(null);
  // Re-check the player's own result whenever the round, phase or reveal changes.
  const meKey = game ? `${game.gameId}:${game.round}:${game.status}:${locked}:${Boolean(game.reveal)}` : "";
  useEffect(() => {
    if (meKey) fetchZoomMe().then(setMe).catch(() => {});
  }, [meKey]);

  if (game === undefined) return <p className="muted center">Shaking the snow globe…</p>;
  if (me && !me.loggedIn) return <LoginPrompt next="/games?game=zoom" />;
  if (game.status === "stopped") {
    return (
      <div className="panel-inner empty">
        <p className="big-emoji" aria-hidden="true">⏹️</p>
        <p>The host stopped the game. Thanks for playing!</p>
      </div>
    );
  }
  if (game.status === "idle") {
    return (
      <div className="panel-inner empty">
        <p className="big-emoji" aria-hidden="true">🔍</p>
        <p>Waiting for the host to start Guess the Item…</p>
        <p className="muted small-print">5 pictures · each one zooms out every 10 seconds · fastest correct answers win</p>
      </div>
    );
  }

  const roundLabel = `Picture ${game.round + 1} of ${game.rounds}`;

  if (game.status === "leaderboard" || game.status === "final") {
    const final = game.status === "final";
    const played = game.stoppedEarly ? game.round + 1 : game.rounds;
    return (
      <div className="panel-inner">
        <h3 className="sun-heading">{final ? "🏆 Final leaderboard" : `Leaderboard after picture ${game.round + 1}`}</h3>
        {game.stoppedEarly && <p className="muted center small-print">The host ended the game after picture {game.round + 1}.</p>}
        <Leaderboard rows={game.leaderboard} rounds={played} final={final} meTicket={me?.standing?.ticketNo} />
        <MyStanding standing={me?.standing} rounds={played} players={game.players} />
        {!final && <p className="muted small-print center">The next picture is coming up…</p>}
      </div>
    );
  }

  const secondsLeft = Math.max(0, Math.ceil(((phase?.nextAt ?? ZOOM_LOCK_MS) - (now - game.startedAt)) / 1000));
  const fullyOut = phase && phase.level >= 3;

  return (
    <div className="panel-inner zoom-player">
      <div className="zoom-meta">
        <span>{roundLabel}</span>
        {!locked && (
          <span className={`timer ${fullyOut ? "urgent" : ""}`}>
            {fullyOut ? `Answers lock in ${secondsLeft}s` : `Zooming out in ${secondsLeft}s`}
          </span>
        )}
        {locked && <span className="timer">Answers locked</span>}
      </div>
      <ZoomStage imageBase={game.imageBase} level={locked ? 3 : phase.level} answer={game.reveal?.answer} />
      {error && <p className="note">{error}</p>}
      {locked ? (
        <RevealResult me={me} reveal={game.reveal} />
      ) : (
        <AnswerBox key={`${game.gameId}-${game.round}`} current={me?.round === game.round ? me?.entry : null} onSaved={setMe} round={game.round} />
      )}
    </div>
  );
}

function AnswerBox({ current, onSaved, round }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError("");
    try {
      const { entry } = await submitZoomAnswer(text);
      onSaved((m) => ({ ...m, round, entry }));
      setText("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {current && (
        <p className="my-pick">
          Your answer: <b className="answer-text">{current.text}</b>
          <small>You can change it until answers lock — your time counts from your last answer.</small>
        </p>
      )}
      <form className="sun-form" onSubmit={submit}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="What is it?" maxLength={60} aria-label="Your guess" autoComplete="off" />
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? "Sending…" : current ? "Change answer" : "Submit"}
        </button>
      </form>
      {error && <p className="note error-text center">{error}</p>}
    </>
  );
}

function RevealResult({ me, reveal }) {
  if (!reveal) return <p className="muted center">Revealing the answer…</p>;
  return (
    <div className="reveal-box">
      {me?.entry && me.correct === undefined ? (
        <p className="my-outcome">Checking your answer…</p>
      ) : me?.entry ? (
        <p className={`my-outcome ${me.correct ? "won" : ""}`}>
          {me.correct ? `✅ Correct! You answered “${me.entry.text}” in ${fmtTime(me.entry.atMs)}.` : `❌ You said “${me.entry.text}”.`}
        </p>
      ) : (
        <p className="my-outcome">You didn’t answer this one.</p>
      )}
      <p className="muted center">
        {reveal.correct} of {reveal.total} guest{reveal.total === 1 ? "" : "s"} got it right. Waiting for the host…
      </p>
    </div>
  );
}

function MyStanding({ standing, rounds, players }) {
  if (!standing) return <p className="muted center small-print">You haven’t answered any pictures yet.</p>;
  return (
    <p className="my-standing">
      You’re <b>#{standing.rank}</b> of {players} · {standing.correct}/{rounds} correct
      {standing.correct ? ` · ${fmtTime(standing.timeMs)}` : ""}
    </p>
  );
}
