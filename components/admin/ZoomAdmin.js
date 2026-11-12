"use client";

import { useEffect, useRef, useState } from "react";
import ZoomStage from "@/components/games/ZoomStage";
import Leaderboard from "@/components/games/Leaderboard";
import JoinQr from "./JoinQr";
import { fetchAdminImage, fetchZoom, fetchZoomItems, zoomAdmin } from "@/lib/store";
import { usePolling, useServerNow } from "@/lib/hooks";
import { cropRect, fileToImage, makeZoomLevels, suggestFocus } from "@/lib/imageTools";
import { ZOOM_LOCK_MS, ZOOM_SCALES, ZOOM_STEP_MS, zoomPhase } from "@/lib/rules";

export default function ZoomAdmin() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [unsaved, setUnsaved] = useState({}); // slot -> true when it has unsaved changes
  const anyUnsaved = Object.values(unsaved).some(Boolean);

  // Warn before leaving the page with pictures that haven't been saved yet.
  useEffect(() => {
    if (!anyUnsaved) return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [anyUnsaved]);
  const { data: game, refresh, setData: setGame } = usePolling(fetchZoom, (g) => (g?.status === "playing" ? 1500 : 3000));

  useEffect(() => {
    fetchZoomItems()
      .then((d) => setItems(d.items))
      .catch((e) => setError(e.message));
  }, []);

  const running = game?.status === "playing" || game?.status === "leaderboard";

  async function control(action) {
    if (action === "reset" && !confirm("Reset Guess the Item? The current game and its leaderboard will be cleared.")) return;
    setError("");
    try {
      const res = await zoomAdmin(action);
      setItems(res.items);
      setGame(res.game);
      refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="stack">
      <HostPanel game={game} items={items} onControl={control} error={error} />
      <section className="panel">
        <h2 className="panel-title">🖼️ Pictures &amp; answers</h2>
        <p className="muted">
          Upload one picture per round and type the answer. Add other accepted answers separated by commas (e.g. “mug, coffee cup”).
          Small typos are accepted automatically. Click the picture to choose where the close-up starts, then press <b>Save</b>{" "}
          on each round. Saved pictures are stored in the database and stay there when you close the page.
          {running && " Pictures are locked while a game is running."}
        </p>
        {anyUnsaved && (
          <p className="banner">
            Rounds {Object.keys(unsaved).filter((k) => unsaved[k]).map((k) => Number(k) + 1).join(", ")} have unsaved changes — press Save
            on each.
          </p>
        )}
        {!items ? (
          <p className="muted">Loading…</p>
        ) : (
          <div className="slot-grid">
            {items.map((item, slot) => (
              <SlotEditor
                key={slot}
                slot={slot}
                item={item}
                disabled={running}
                onSaved={setItems}
                onDirty={(d) => setUnsaved((u) => (u[slot] === d ? u : { ...u, [slot]: d }))}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function HostPanel({ game, items, onControl, error }) {
  const stageRef = useRef(null);
  const playing = game?.status === "playing";
  const now = useServerNow(250, playing);
  const phase = playing ? zoomPhase(now - game.startedAt) : null;
  const ready = items && items.every(Boolean);

  // Presenter remote / keyboard: → or N = Next.
  const canNext = (playing && Boolean(game?.reveal)) || game?.status === "leaderboard";
  const nextRef = useRef(null);
  nextRef.current = canNext ? () => onControl("next") : null;
  useEffect(() => {
    const onKey = (e) => {
      if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
      if ((e.key === "ArrowRight" || e.key.toLowerCase() === "n") && nextRef.current) {
        e.preventDefault();
        nextRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!game) return <section className="panel">Loading…</section>;
  const status = game.status;
  const elapsed = playing ? now - game.startedAt : 0;
  const secondsLeft = playing ? Math.max(0, Math.ceil(((phase.nextAt ?? ZOOM_LOCK_MS) - elapsed) / 1000)) : 0;

  return (
    <section className="panel host-screen" ref={stageRef}>
      <div className="panel-head">
        <h2 className="panel-title">🔍 Guess the Item — host</h2>
        <div className="actions">
          <button className="btn small ghost" onClick={() => (document.fullscreenElement ? document.exitFullscreen() : stageRef.current?.requestFullscreen?.())}>
            ⛶ Big screen
          </button>
          {status !== "idle" && (
            <button className="btn small ghost" onClick={() => onControl("reset")}>
              Reset game
            </button>
          )}
        </div>
      </div>

      {status === "idle" && (
        <div className="host-idle">
          <JoinQr path="/games?game=zoom" label="Scan to play Guess the Item" />
          <div>
            <p>
              {ready
                ? "All 5 pictures are ready. Ask everyone to open Games → Guess the Item on their phones, then start."
                : "Add all 5 pictures below before starting."}
            </p>
            <button className="btn primary big" onClick={() => onControl("start")} disabled={!ready}>
              Start game
            </button>
          </div>
        </div>
      )}

      {playing && (
        <div className="host-play">
          <div className="zoom-meta big">
            <span>
              Picture {game.round + 1} of {game.rounds}
            </span>
            <span className={`timer ${phase.level >= 3 && !phase.locked ? "urgent" : ""}`}>
              {phase.locked ? "Answers locked" : phase.level >= 3 ? `Answers lock in ${secondsLeft}s` : `Zooming out in ${secondsLeft}s`}
            </span>
            <span>{game.answerCount ?? 0} answers</span>
          </div>
          <ZoomStage imageBase={game.imageBase} level={phase.level} answer={game.reveal?.answer} />
          <ZoomTimeline elapsed={elapsed} />
          {phase.locked && game.reveal && (
            <p className="center reveal-stat">
              <b>{game.reveal.correct}</b> of {game.reveal.total} got it right
            </p>
          )}
          <div className="actions">
            <button className="btn primary big" onClick={() => onControl("next")} disabled={!game.reveal}>
              {game.round + 1 >= game.rounds ? "Show final leaderboard →" : "Show leaderboard →"}
            </button>
          </div>
        </div>
      )}

      {(status === "leaderboard" || status === "final") && (
        <div className="host-play">
          <h3 className="sun-heading center-text">{status === "final" ? "🏆 Final leaderboard" : `Leaderboard after picture ${game.round + 1} of ${game.rounds}`}</h3>
          <Leaderboard rows={game.leaderboard} rounds={game.rounds} final={status === "final"} big />
          <div className="actions">
            {status === "leaderboard" ? (
              <button className="btn primary big" onClick={() => onControl("next")}>
                Next picture ({game.round + 2} of {game.rounds}) →
              </button>
            ) : (
              <button className="btn primary" onClick={() => onControl("start")} disabled={!ready}>
                Play again from picture 1
              </button>
            )}
          </div>
        </div>
      )}
      {error && <p className="note error-text center">{error}</p>}
      <p className="muted small-print center">Shortcut: → or N for Next (works with a presenter clicker).</p>
    </section>
  );
}

function ZoomTimeline({ elapsed }) {
  const pct = Math.min(100, (elapsed / ZOOM_LOCK_MS) * 100);
  return (
    <div className="zoom-timeline" aria-hidden="true">
      <div className="zoom-timeline-fill" style={{ width: `${pct}%` }} />
      {[1, 2, 3].map((k) => (
        <span key={k} className="tick" style={{ left: `${(k * ZOOM_STEP_MS * 100) / ZOOM_LOCK_MS}%` }} />
      ))}
    </div>
  );
}

function SlotEditor({ slot, item, disabled, onSaved, onDirty }) {
  const [answer, setAnswer] = useState(item?.answer || "");
  const [alternatives, setAlternatives] = useState(item?.alternatives || "");
  const [img, setImg] = useState(null); // newly chosen picture (not saved yet)
  const [focus, setFocus] = useState({ x: 0.5, y: 0.5 });
  const [savedPreview, setSavedPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    setAnswer(item?.answer || "");
    setAlternatives(item?.alternatives || "");
  }, [item?.answer, item?.alternatives]);

  useEffect(() => {
    if (!item?.version) return;
    let url = "";
    fetchAdminImage(`/api/zoom/image?slot=${slot}&level=3&preview=1&v=${item.version}`)
      .then((u) => setSavedPreview((url = u)))
      .catch(() => {});
    return () => url && URL.revokeObjectURL(url);
  }, [slot, item?.version]);

  const dirty = Boolean(img) || answer !== (item?.answer || "") || alternatives !== (item?.alternatives || "");
  useEffect(() => onDirty(dirty), [dirty]); // eslint-disable-line react-hooks/exhaustive-deps

  async function choose(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const image = await fileToImage(file);
      setImg(image);
      setFocus(suggestFocus(image));
      if (!answer) setAnswer(file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim());
      setNote("Click the picture to move the zoom spot, then save.");
    } catch (err) {
      setNote(`${err.message}. Please use a JPG or PNG (iPhone HEIC photos need converting first).`);
    }
  }

  async function save() {
    setBusy(true);
    setNote("");
    try {
      const images = img ? makeZoomLevels(img, focus) : undefined;
      await zoomAdminSave(slot, answer, alternatives, images);
      // Read it back from the database to prove it was stored.
      const { items } = await fetchZoomItems();
      const stored = items[slot];
      if (!stored || stored.answer !== answer.trim()) throw new Error("The server didn’t keep this picture — please try again");
      const check = await fetchAdminImage(`/api/zoom/image?slot=${slot}&level=0&preview=1&v=${stored.version}`);
      URL.revokeObjectURL(check);
      onSaved(items);
      setImg(null);
      setNote("Saved ✓ Stored in the database.");
    } catch (err) {
      setNote(`Not saved: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Remove picture ${slot + 1}?`)) return;
    try {
      const { items } = await zoomAdmin("delete", { slot });
      onSaved(items);
      setSavedPreview("");
    } catch (err) {
      setNote(err.message);
    }
  }

  return (
    <div className={`slot-card ${item ? "ready" : ""} ${dirty ? "unsaved" : ""}`}>
      <p className="slot-title">
        Round {slot + 1}
        {dirty ? (
          <span className="slot-badge warn">Not saved</span>
        ) : item ? (
          <span className="slot-badge">Saved ✓</span>
        ) : (
          <span className="slot-badge empty-badge">Empty</span>
        )}
      </p>
      {img ? (
        <FocusPicker img={img} focus={focus} onFocus={setFocus} />
      ) : savedPreview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="slot-preview" src={savedPreview} alt={`Round ${slot + 1} picture`} />
      ) : (
        <div className="slot-empty">No picture yet</div>
      )}
      <label className="btn small upload-btn" aria-disabled={disabled}>
        {item || img ? "Change picture" : "+ Upload picture"}
        <input type="file" accept="image/*" hidden onChange={choose} disabled={disabled} />
      </label>
      <label>
        Answer
        <input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="e.g. Coffee mug" disabled={disabled} maxLength={60} />
      </label>
      <label>
        Also accept <small className="muted">(optional, comma separated)</small>
        <input value={alternatives} onChange={(e) => setAlternatives(e.target.value)} placeholder="e.g. mug, cup" disabled={disabled} />
      </label>
      <div className="actions">
        <button className="btn small primary" onClick={save} disabled={disabled || busy || !dirty || !answer.trim() || (!item && !img)}>
          {busy ? "Saving…" : "Save"}
        </button>
        {item && (
          <button className="link danger" onClick={remove} disabled={disabled}>
            Remove
          </button>
        )}
      </div>
      {note && <p className="note small-print">{note}</p>}
    </div>
  );
}

const zoomAdminSave = (slot, answer, alternatives, images) => zoomAdmin("save", { slot, answer, alternatives, images });

// Full picture with the zoom spot marked; click to move it. Shows what each clue looks like.
function FocusPicker({ img, focus, onFocus }) {
  const [thumbs, setThumbs] = useState([]);
  useEffect(() => {
    const t = setTimeout(() => setThumbs(makeZoomLevels(img, focus).slice(0, 3)), 120);
    return () => clearTimeout(t);
  }, [img, focus]);
  const r = cropRect(img, focus, ZOOM_SCALES[0]);
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  return (
    <div className="focus-picker">
      <div
        className="focus-frame"
        style={{ aspectRatio: `${W} / ${H}`, width: `min(100%, ${Math.round((260 * W) / H)}px)` }}
        onClick={(e) => {
          const box = e.currentTarget.getBoundingClientRect();
          onFocus({ x: (e.clientX - box.left) / box.width, y: (e.clientY - box.top) / box.height });
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img.src} alt="" />
        <span
          className="focus-box"
          style={{ left: `${(r.x / W) * 100}%`, top: `${(r.y / H) * 100}%`, width: `${(r.w / W) * 100}%`, height: `${(r.h / H) * 100}%` }}
        />
      </div>
      <div className="focus-thumbs">
        {thumbs.map((t, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={t} alt={`Clue ${i + 1}`} title={`Clue ${i + 1}`} />
        ))}
      </div>
    </div>
  );
}
