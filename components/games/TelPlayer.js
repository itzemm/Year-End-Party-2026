"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import DrawingPad from "./DrawingPad";
import TelTeams from "./TelTeams";
import TelReveal from "./TelReveal";
import { fetchTel, fetchTelMe, submitAudienceGuess, submitTel } from "@/lib/store";
import { usePolling, useServerNow } from "@/lib/hooks";
import { TEL_TEAM_NAMES, telPhase, telStepsDone } from "@/lib/rules";

const secs = (ms) => Math.max(0, Math.ceil(ms / 1000));
const names = (game, step) => game.teams.map((t) => t.members[step]?.name).filter(Boolean).join(", ");

// What guests see during Broken Telephone: their turn (draw / copy / guess) on their
// phone, otherwise the team table, timer and finally the reveal.
export default function TelPlayer() {
  // Team players check every second so their turn shows up promptly; spectators less often.
  const onTeamRef = useRef(false);
  const { data: game, error } = usePolling(fetchTel, (g) =>
    !g || g.status === "setup" ? 5000 : g.status === "playing" && onTeamRef.current ? 1000 : 2500
  );
  const playing = game?.status === "playing";
  const now = useServerNow(250, playing);
  const [me, setMe] = useState(null);
  onTeamRef.current = Boolean(me?.onTeam);
  // Re-fetch my info when the turn changes or a turn's drawings become final (audience view).
  const stepsDone = game?.status === "playing" ? telStepsDone(game, now) : 0;
  const meKey = game ? `${game.status}:${game.gameId}:${game.step}:${game.endsAt}:${game.teams.length}:${stepsDone}` : "";
  useEffect(() => {
    if (meKey) fetchTelMe().then(setMe).catch(() => {});
  }, [meKey]);

  if (game === undefined) return <p className="muted center">Shaking the snow globe…</p>;
  const phase = telPhase(game, now);
  const myTicket = me?.onTeam ? game.teams[me.team]?.members[me.slot]?.ticketNo : null;

  // My turn: full drawing / guessing screen.
  if (playing && me?.turn && !me.submitted && me.turn.endsAt === game.endsAt) {
    return <TurnView key={`${game.gameId}-${me.turn.step}`} turn={me.turn} now={now} onSent={() => setMe((m) => ({ ...m, submitted: true }))} />;
  }

  if (game.status === "revealTeams" || game.status === "revealAnswer") {
    return (
      <div className="panel-inner">
        <h3 className="sun-heading">📞 The big reveal</h3>
        <TelReveal
          chains={game.chains}
          teams={game.teams}
          sentence={game.sentence}
          audienceTop={game.audienceTop}
          audienceCount={game.audienceCount}
          myGuess={me?.audience?.guess}
          meTicket={myTicket || me?.audience?.guess?.ticketNo}
        />
      </div>
    );
  }

  let status;
  if (game.status === "setup") status = game.teams.length ? "Teams are ready — the game starts soon!" : "Waiting for the host to pick the teams…";
  else if (phase.kind === "ready") status = `Waiting for the host to start the timer for ${names(game, phase.active)}.`;
  else if (phase.kind === "running") status = `${names(game, game.step)} ${game.step === game.teamSize - 1 ? "are writing their guesses" : "are drawing"} — ${secs(game.endsAt - now)}s left`;
  else if (phase.kind === "between") status = `Time’s up! Next up: ${names(game, phase.active)}.`;
  else if (phase.kind === "finished") status = "Everyone has played — the reveal is coming up!";

  let mine = null;
  if (me && !me.loggedIn) {
    mine = (
      <p className="muted center small-print">
        <Link href="/my-ticket?next=/games">Log in on My Ticket</Link> to draw when it’s your turn — or, if you’re not on a team, to guess the sentence
        yourself.
      </p>
    );
  } else if (me?.onTeam) {
    const step = phase.active;
    let text = `You’re player ${me.slot + 1} in ${me.teamName}.`;
    if (playing && me.submitted) text += " Yours is sent ✓";
    else if (playing && step === me.slot) text += phase.kind === "running" ? " It’s your turn — loading…" : " You’re up next — get ready!";
    else if (playing && step != null && me.slot === step + 1) text += " You’re after the next turn.";
    mine = <p className="my-standing">{text}</p>;
  }

  return (
    <div className="panel-inner">
      {playing && phase.kind === "running" && <p className={`big-timer ${game.endsAt - now < 10000 ? "urgent" : ""}`}>{secs(game.endsAt - now)}</p>}
      <p className="center">{status}</p>
      {mine}
      {playing && me?.audience && <AudiencePanel audience={me.audience} onGuess={(guess) => setMe((m) => ({ ...m, audience: { ...m.audience, guess } }))} />}
      <TelTeams teams={game.teams} active={playing ? phase.active : game.teams.length ? 0 : null} submitted={game.submitted} meTicket={myTicket} />
      {error && <p className="note">{error}</p>}
    </div>
  );
}

// Guests not on a team watch each team's finished drawings and guess the sentence.
function AudiencePanel({ audience, onGuess }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const any = audience.drawings.some((d) => d.length);

  async function send(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError("");
    try {
      const { guess } = await submitAudienceGuess(text);
      onGuess(guess);
      setText("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="audience-panel">
      <h3 className="sun-heading">🕵️ Audience: guess the secret sentence</h3>
      <p className="muted center small-print">
        Each team’s drawings appear here as their turns finish. Guess any time — you can change it until the teams’ answers are revealed. The closest
        guess wins!
      </p>
      {any ? (
        <div className="audience-drawings">
          {audience.drawings.map((steps, t) => (
            <div key={t} className="audience-team">
              <small>{TEL_TEAM_NAMES[t]}</small>
              <div className="audience-row">
                {steps.map((d, s) =>
                  d.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={s} src={d.imageUrl} alt={`Drawing ${s + 1} by ${d.name}`} title={`${s + 1}. ${d.name}`} />
                  ) : (
                    <span key={s} className="audience-missing" title={`${s + 1}. ${d.name}`}>
                      —
                    </span>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="center">✏️ The first drawings will show up here when player 1’s time is up.</p>
      )}
      {audience.guess && (
        <p className="my-pick">
          Your guess: <b className="answer-text">“{audience.guess.text}”</b>
        </p>
      )}
      <form className="sun-form" onSubmit={send}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="I think the sentence is…" maxLength={160} />
        <button className="btn primary" type="submit" disabled={busy || !text.trim()}>
          {audience.guess ? "Change my guess" : "Send my guess"}
        </button>
      </form>
      {error && <p className="note error-text center">{error}</p>}
    </div>
  );
}

function TurnView({ turn, now, onSent }) {
  const pad = useRef(null);
  const viewRef = useRef(null);
  const [bigSource, setBigSource] = useState(false);

  // Jump straight to the drawing area when the turn starts.
  useEffect(() => {
    viewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);
  const [text, setText] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | sent | error
  const [error, setError] = useState("");
  const left = turn.endsAt - now;
  const timeUp = left <= 0;

  async function send() {
    if (state === "sending" || state === "sent") return;
    const payload = turn.task === "guess" ? { text } : pad.current?.hasDrawing() ? { image: pad.current.toDataUrl() } : null;
    if (!payload || (turn.task === "guess" && !text.trim())) {
      if (timeUp) setState("sent"); // nothing to send — the chain skips you
      else setError(turn.task === "guess" ? "Type your guess first" : "Draw something first");
      return;
    }
    setState("sending");
    setError("");
    try {
      await submitTel(payload);
      setState("sent");
      setTimeout(onSent, 1200);
    } catch (err) {
      setState("error");
      setError(err.message);
    }
  }

  // Time's up: whatever is on the pad (or typed) is sent automatically.
  const sendRef = useRef(send);
  sendRef.current = send;
  useEffect(() => {
    if (timeUp && state === "idle") sendRef.current();
  }, [timeUp, state]);

  const heading = turn.task === "draw" ? "Draw this sentence" : turn.task === "copy" ? "Copy this drawing" : "What does this drawing show?";

  return (
    <div className="panel-inner tel-turn-view" ref={viewRef}>
      <div className={`tel-turn-head ${turn.image ? "with-source" : ""}`}>
        {turn.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className={`tel-source ${bigSource ? "big" : ""}`}
            src={turn.image}
            alt="The drawing passed to you (tap to enlarge)"
            onClick={() => setBigSource((v) => !v)}
          />
        )}
        <div className="tel-turn-info">
          <b>{heading}</b>
          <span className={`big-timer small ${left < 10000 ? "urgent" : ""}`}>{timeUp ? "Time’s up!" : `${secs(left)}s`}</span>
          {turn.image && <small className="muted">Tap the drawing to enlarge it</small>}
        </div>
      </div>
      {turn.task === "draw" && <p className="tel-prompt">“{turn.sentence}”</p>}
      {turn.task === "guess" && !turn.image && <p className="muted center">No drawing reached you — make your best guess!</p>}
      {turn.task === "guess" ? (
        <form
          className="sun-form"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="I think it’s…" maxLength={120} disabled={state === "sent"} autoFocus />
          <button className="btn primary" type="submit" disabled={state === "sending" || state === "sent"}>
            {state === "sent" ? "Sent ✓" : "Send my answer"}
          </button>
        </form>
      ) : (
        <>
          <DrawingPad ref={pad} disabled={state === "sent" || state === "sending" || timeUp} />
          <button className="btn primary" onClick={send} disabled={state === "sending" || state === "sent"}>
            {state === "sent" ? "Sent ✓" : state === "sending" ? "Sending…" : "I’m done — send it"}
          </button>
        </>
      )}
      {error && <p className="note error-text center">{error}</p>}
    </div>
  );
}
