"use client";

import { useEffect, useRef, useState } from "react";
import { Confetti } from "@/components/Confetti";
import { StageContestants, StageQuestion } from "@/components/games/StagePlayer";
import { fetchStageAdmin, stageAdmin } from "@/lib/store";
import { usePolling } from "@/lib/hooks";
import { STAGE_PICK } from "@/lib/rules";

export default function StageAdmin() {
  const { data: s, setData, refresh } = usePolling(fetchStageAdmin, () => 4000);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [custom, setCustom] = useState("");
  const [selected, setSelected] = useState([]);
  const stageRef = useRef(null);

  useEffect(() => setSelected([]), [s?.round]);

  async function act(action, extra) {
    if (action === "reset" && !confirm("Start over? Everyone can be called up again and the round history is cleared.")) return;
    if (action === "draw" && s?.status === "question" && !confirm("Draw new names without picking a winner for this round?")) return;
    setBusy(true);
    setError("");
    try {
      setData(await stageAdmin(action, extra));
    } catch (e) {
      setError(e.message);
      refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!s) return <section className="panel">Loading…</section>;
  const toggle = (t) => setSelected((sel) => (sel.includes(t) ? sel.filter((x) => x !== t) : [...sel, t]));

  return (
    <section className="panel host-screen stage-host" ref={stageRef}>
      {s.status === "winners" && <Confetti key={`${s.round}-${s.winners.join()}`} />}
      <div className="panel-head">
        <h2 className="panel-title">🎤 Spotlight — host {s.round > 0 && <span className="muted">· Round {s.round}</span>}</h2>
        <div className="actions">
          <button className="btn small ghost" onClick={() => (document.fullscreenElement ? document.exitFullscreen() : stageRef.current?.requestFullscreen?.())}>
            ⛶ Big screen
          </button>
          {s.status !== "idle" && (
            <button className="btn small danger-btn" onClick={() => act("stop")} disabled={busy}>
              ■ Stop game
            </button>
          )}
        </div>
      </div>

      {s.status === "idle" ? (
        <div className="host-play">
          <p className="big-emoji" aria-hidden="true">🎤</p>
          <p className="center">
            Draw {STAGE_PICK} random names to come up on stage. Nobody is called twice — {s.remaining} of {s.remaining + s.pickedCount} guests haven’t been
            picked yet.
          </p>
          <button className="btn primary big" onClick={() => act("draw")} disabled={busy || s.remaining === 0}>
            🎲 Draw {STAGE_PICK} names
          </button>
        </div>
      ) : (
        <div className="host-play">
          <StageQuestion question={s.question} big />
          <StageContestants
            contestants={s.contestants}
            winners={s.winners}
            big
            onToggle={s.status === "question" ? toggle : undefined}
            selected={selected}
            onReplace={s.status === "drawn" || s.status === "question" ? (ticketNo) => act("replace", { ticketNo }) : undefined}
          />

          {s.status === "drawn" && (
            <p className="center muted">Ask these {s.contestants.length} people to come up on stage, then reveal the question.</p>
          )}
          {s.status === "question" && (
            <p className="center muted">Tap the winner(s) above, then confirm.{selected.length ? ` Selected: ${selected.length}` : ""}</p>
          )}

          <div className="actions">
            {(s.status === "drawn" || s.status === "question") && (
              <button className={`btn ${s.status === "drawn" ? "primary big" : ""}`} onClick={() => act("question")} disabled={busy}>
                🎲 {s.status === "drawn" ? "Reveal a random question" : "Different question"}
              </button>
            )}
            {s.status === "question" && (
              <button className="btn primary big" onClick={() => act("winners", { winners: selected })} disabled={busy || !selected.length}>
                🏆 Confirm winner{selected.length > 1 ? "s" : ""}
              </button>
            )}
            {s.status === "winners" && (
              <button className="btn primary big" onClick={() => act("draw")} disabled={busy || s.remaining === 0}>
                🎲 Next round: draw {STAGE_PICK} new names
              </button>
            )}
          </div>

          {(s.status === "drawn" || s.status === "question") && (
            <form
              className="sun-form stage-custom"
              onSubmit={(e) => {
                e.preventDefault();
                act("question", { text: custom });
                setCustom("");
              }}
            >
              <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="…or type your own question" maxLength={160} />
              <button className="btn small" type="submit" disabled={busy || !custom.trim()}>
                Use this question
              </button>
            </form>
          )}
          <p className="muted small-print center">
            {s.remaining} guests left who haven’t been called up · ↻ swaps someone who isn’t here for another random guest
          </p>
        </div>
      )}
      {error && <p className="note error-text center">{error}</p>}

      {s.history.length > 0 && (
        <details className="stage-history">
          <summary>Previous rounds ({s.history.length})</summary>
          <ol>
            {s.history.map((h) => (
              <li key={h.round}>
                <b>Round {h.round}:</b> {h.question} — winner{h.winners.length === 1 ? "" : "s"}: {h.winners.length ? h.winners.join(", ") : "none"}{" "}
                <span className="muted">({h.contestants.join(", ")})</span>
              </li>
            ))}
          </ol>
          <button className="btn small ghost" onClick={() => act("reset")} disabled={busy}>
            Start over (everyone can be picked again)
          </button>
        </details>
      )}
    </section>
  );
}
