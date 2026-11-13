"use client";

import { useEffect, useRef, useState } from "react";
import TelTeams from "@/components/games/TelTeams";
import TelReveal from "@/components/games/TelReveal";
import JoinQr from "./JoinQr";
import { fetchTelAdmin, telAdmin } from "@/lib/store";
import { usePolling, useServerNow } from "@/lib/hooks";
import { TEL_GRACE_MS, telDuration, telPhase } from "@/lib/rules";

const secs = (ms) => Math.max(0, Math.ceil(ms / 1000));
const label = (ms) => (ms % 60000 === 0 ? `${ms / 60000}-minute` : `${Math.round(ms / 1000)}-second`);

export default function TelAdmin() {
  const { data: game, setData, refresh } = usePolling(fetchTelAdmin, (g) => (g?.status === "playing" ? 1000 : 3000));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const stageRef = useRef(null);
  const playing = game?.status === "playing";
  const now = useServerNow(250, playing);

  async function act(action, extra) {
    if (action === "stop" && !confirm("Stop Broken Telephone? Drawings so far are discarded; teams and sentence are kept.")) return;
    if (action === "teams" && game?.teams.length && !confirm("Make new random teams?")) return;
    setBusy(true);
    setError("");
    try {
      setData(await telAdmin(action, extra));
    } catch (e) {
      setError(e.message);
      refresh();
    } finally {
      setBusy(false);
    }
  }

  const phase = game ? telPhase(game, now) : null;
  const canAdvance = playing && (phase.kind === "ready" || (phase.kind === "between" && !phase.collecting));
  const canReveal = playing && phase.kind === "finished" && now >= game.endsAt + TEL_GRACE_MS;

  // Space / → triggers the main button (presenter clicker friendly).
  const mainRef = useRef(null);
  mainRef.current = busy ? null : canAdvance ? () => act("timer") : canReveal ? () => act("revealTeams") : game?.status === "revealTeams" ? () => act("revealAnswer") : null;
  useEffect(() => {
    const onKey = (e) => {
      if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
      if ((e.key === " " || e.key === "ArrowRight") && mainRef.current) {
        e.preventDefault();
        mainRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!game) return <section className="panel">Loading…</section>;
  const nextNames = (step) => game.teams.map((t) => t.members[step]?.name).filter(Boolean).join(", ");

  return (
    <section className="panel host-screen" ref={stageRef}>
      <div className="panel-head">
        <h2 className="panel-title">📞 Broken Telephone — host</h2>
        <div className="actions">
          <button className="btn small ghost" onClick={() => (document.fullscreenElement ? document.exitFullscreen() : stageRef.current?.requestFullscreen?.())}>
            ⛶ Big screen
          </button>
          {game.status !== "setup" && (
            <button className="btn small danger-btn" onClick={() => act("stop")} disabled={busy}>
              ■ Stop game
            </button>
          )}
        </div>
      </div>

      {game.status === "setup" && <Setup game={game} busy={busy} act={act} />}

      {playing && (
        <div className="host-play">
          {phase.kind === "running" ? (
            <>
              <p className={`host-count ${game.endsAt - now < 10000 ? "urgent" : ""}`}>{secs(game.endsAt - now)}</p>
              <p className="center">
                {game.step === game.teamSize - 1 ? "Writing their final guess: " : game.step === 0 ? "Drawing the sentence: " : "Copying the drawing: "}
                <b>{nextNames(game.step)}</b>
              </p>
            </>
          ) : phase.kind === "finished" ? (
            <p className="host-count small">{canReveal ? "All done!" : "Collecting the last answers…"}</p>
          ) : (
            <p className="center tel-next">
              {phase.kind === "between" ? "Time’s up! " : ""}Next: <b>{nextNames(phase.active)}</b>
              {phase.collecting && <small> (collecting drawings…)</small>}
            </p>
          )}

          <TelTeams
            teams={game.teams}
            active={phase.active}
            submitted={game.submitted}
            onReplace={(team, slot) => act("replace", { team, slot })}
            canReplace={(s) => phase.active != null && s > (phase.kind === "running" ? game.step : phase.active - 1)}
          />

          <div className="actions">
            {canReveal ? (
              <button className="btn primary big" onClick={() => act("revealTeams")} disabled={busy}>
                Reveal every team’s drawings &amp; answers →
              </button>
            ) : (
              <button className="btn primary big" onClick={() => act("timer")} disabled={busy || !canAdvance}>
                {phase.kind === "running"
                  ? "Timer running…"
                  : phase.kind === "finished"
                    ? "Collecting…"
                    : `▶ Start ${label(telDuration(phase.active))} timer for player ${phase.active + 1}`}
              </button>
            )}
          </div>
          <p className="muted small-print center">Space or → presses the big button. ↻ swaps a player who hasn’t played yet for another random guest.</p>
        </div>
      )}

      {(game.status === "revealTeams" || game.status === "revealAnswer") && (
        <div className="host-play">
          <TelReveal chains={game.chains} teams={game.teams} sentence={game.status === "revealAnswer" ? game.sentence : null} big />
          <div className="actions">
            {game.status === "revealTeams" ? (
              <button className="btn primary big" onClick={() => act("revealAnswer")} disabled={busy}>
                Reveal the secret sentence →
              </button>
            ) : (
              <button className="btn primary" onClick={() => act("stop")} disabled={busy}>
                Finish &amp; set up another round
              </button>
            )}
          </div>
        </div>
      )}
      {error && <p className="note error-text center">{error}</p>}
    </section>
  );
}

function Setup({ game, busy, act }) {
  const [sentence, setSentence] = useState("");
  const [show, setShow] = useState(false);
  const hasTeams = game.teams.length > 0;
  return (
    <div className="tel-setup">
      <div className="tel-setup-row">
        <div className="tel-step-box">
          <p className="slot-title">1 · Teams</p>
          <p className="muted small-print">3 random teams of 5 from the registered guests. Player 1 in each team draws first.</p>
          <button className="btn primary" onClick={() => act("teams")} disabled={busy}>
            🎲 {hasTeams ? "Shuffle new teams" : "Generate teams"}
          </button>
        </div>
        <div className="tel-step-box">
          <p className="slot-title">
            2 · Secret sentence {game.sentence ? <span className="slot-badge">Set ✓</span> : <span className="slot-badge empty-badge">Not set</span>}
          </p>
          {game.sentence && (
            <p className="tel-secret">
              {show ? `“${game.sentence}”` : "•••••••• (hidden from the big screen)"}{" "}
              <button className="link" onClick={() => setShow((s) => !s)}>
                {show ? "Hide" : "Show"}
              </button>
            </p>
          )}
          <form
            className="sun-form"
            onSubmit={(e) => {
              e.preventDefault();
              act("sentence", { sentence });
              setSentence("");
            }}
          >
            <input type="password" value={sentence} onChange={(e) => setSentence(e.target.value)} placeholder="Type a sentence (stays hidden)" maxLength={120} autoComplete="off" />
            <button className="btn small" type="submit" disabled={busy || !sentence.trim()}>
              Set
            </button>
            <button className="btn small ghost" type="button" onClick={() => act("sentence", { random: true })} disabled={busy}>
              🎲 Random
            </button>
          </form>
        </div>
        <div className="tel-step-box">
          <p className="slot-title">3 · Play</p>
          <p className="muted small-print">Team players need to be logged in on their phones (Games → Broken Telephone).</p>
          <button className="btn primary big" onClick={() => act("start")} disabled={busy || !hasTeams || !game.sentence}>
            Start game
          </button>
        </div>
      </div>
      {hasTeams ? (
        <TelTeams teams={game.teams} active={0} onReplace={(team, slot) => act("replace", { team, slot })} canReplace={() => true} />
      ) : (
        <div className="host-idle">
          <JoinQr path="/games?game=tel" label="Scan to follow Broken Telephone" />
        </div>
      )}
    </div>
  );
}
