"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_ZOOM_ITEMS, ZOOM_LEVELS } from "@/lib/zoomItems";

// Host-run picture game for the big screen: start on an extreme close-up of a
// picture, zoom out one step per clue, then reveal. Custom photos are saved in
// this browser only (run the game from the laptop that holds them).

const CUSTOM_KEY = "winter2026.zoomItems";
const BUILTIN_KEY = "winter2026.zoomUseBuiltins";

function loadCustom() {
  try {
    return JSON.parse(window.localStorage.getItem(CUSTOM_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveCustom(items) {
  window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(items)); // may throw when full
}

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Find a detailed spot to zoom into: draw the picture small, then pick among the
// visible points with the most colour variation (so the close-up isn't a flat blob).
function pickFocus(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const N = 120;
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = N;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        const w = img.naturalWidth || N;
        const h = img.naturalHeight || N;
        const scale = Math.min(N / w, N / h);
        const dw = w * scale;
        const dh = h * scale;
        ctx.drawImage(img, (N - dw) / 2, (N - dh) / 2, dw, dh);
        const { data } = ctx.getImageData(0, 0, N, N);
        const lum = (x, y) => {
          const i = (y * N + x) * 4;
          return data[i + 3] < 200 ? -1 : 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
        };
        const R = 4;
        const candidates = [];
        for (let y = Math.round(N * 0.2); y < N * 0.8; y += 3) {
          for (let x = Math.round(N * 0.2); x < N * 0.8; x += 3) {
            if (lum(x, y) < 0) continue;
            let sum = 0;
            let sq = 0;
            let n = 0;
            let transparent = 0;
            for (let dy = -R; dy <= R; dy++) {
              for (let dx = -R; dx <= R; dx++) {
                const v = lum(x + dx, y + dy);
                if (v < 0) transparent++;
                else {
                  sum += v;
                  sq += v * v;
                  n++;
                }
              }
            }
            if (transparent > n / 3) continue; // mostly empty around here
            const variance = sq / n - (sum / n) ** 2;
            candidates.push({ x: x / N, y: y / N, variance });
          }
        }
        if (!candidates.length) return resolve({ x: 0.5, y: 0.5 });
        candidates.sort((a, b) => b.variance - a.variance);
        const top = candidates.slice(0, Math.max(3, Math.ceil(candidates.length * 0.25)));
        resolve(top[Math.floor(Math.random() * top.length)]);
      } catch {
        resolve({ x: 0.5, y: 0.5 });
      }
    };
    img.onerror = () => resolve({ x: 0.5, y: 0.5 });
    img.src = src;
  });
}

// Shrink uploaded photos so dozens fit in browser storage.
function resizePhoto(file, maxSide = 900) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn’t read that file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file isn’t an image"));
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.naturalWidth * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

const prettyName = (filename) =>
  filename
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());

export default function ZoomGuess() {
  const [custom, setCustom] = useState([]);
  const [useBuiltins, setUseBuiltins] = useState(true);
  const [deck, setDeck] = useState([]);
  const [index, setIndex] = useState(0);
  const [level, setLevel] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [focus, setFocus] = useState(null);
  const [note, setNote] = useState("");
  const stageRef = useRef(null);

  useEffect(() => {
    setCustom(loadCustom());
    try {
      setUseBuiltins(window.localStorage.getItem(BUILTIN_KEY) !== "no");
    } catch {
      /* ignore */
    }
  }, []);

  const pool = [...custom, ...(useBuiltins ? DEFAULT_ZOOM_ITEMS : [])];
  const poolKey = pool.map((i) => i.id).join("|");

  // New shuffled deck whenever the set of pictures changes.
  useEffect(() => {
    setDeck(shuffle(pool));
    setIndex(0);
    setLevel(0);
    setRevealed(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolKey]);

  const item = deck[index];

  useEffect(() => {
    if (!item) return;
    let cancelled = false;
    pickFocus(item.src).then((f) => !cancelled && setFocus({ ...f, id: item.id }));
    return () => {
      cancelled = true;
    };
  }, [item]);

  const lastLevel = ZOOM_LEVELS.length - 1;
  const zoomOut = useCallback(() => setLevel((l) => Math.min(l + 1, lastLevel)), [lastLevel]);
  const reveal = useCallback(() => {
    setLevel(lastLevel);
    setRevealed(true);
  }, [lastLevel]);
  const next = useCallback(() => {
    setRevealed(false);
    setLevel(0);
    if (index + 1 < deck.length) setIndex(index + 1);
    else {
      setDeck(shuffle(deck)); // went through every picture: reshuffle and go again
      setIndex(0);
    }
  }, [deck, index]);

  // Presenter keys: Space / ↓ = zoom out, Enter = reveal, → = next picture.
  useEffect(() => {
    function onKey(e) {
      if (["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(document.activeElement?.tagName)) return;
      if (e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        revealed ? next() : zoomOut();
      } else if (e.key === "Enter") {
        e.preventDefault();
        reveal();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomOut, reveal, next, revealed]);

  async function addPhotos(e) {
    const files = [...(e.target.files || [])];
    e.target.value = "";
    if (!files.length) return;
    setNote("Adding photos…");
    const added = [];
    for (const file of files) {
      try {
        added.push({ id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: prettyName(file.name), src: await resizePhoto(file) });
      } catch (err) {
        setNote(`${file.name}: ${err.message}`);
      }
    }
    const nextList = [...custom, ...added];
    try {
      saveCustom(nextList);
      setCustom(nextList);
      setNote(`Added ${added.length} photo${added.length === 1 ? "" : "s"}. Check the answers below are right.`);
    } catch {
      setNote("This browser’s storage is full — remove some photos or use smaller ones.");
    }
  }

  function updateCustom(nextList) {
    try {
      saveCustom(nextList);
    } catch {
      /* keep in memory at least */
    }
    setCustom(nextList);
  }

  function toggleBuiltins(on) {
    setUseBuiltins(on);
    try {
      window.localStorage.setItem(BUILTIN_KEY, on ? "yes" : "no");
    } catch {
      /* ignore */
    }
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else stageRef.current?.requestFullscreen?.();
  }

  const scale = ZOOM_LEVELS[level];
  const focusReady = item && focus?.id === item.id;
  const f = focusReady ? focus : { x: 0.5, y: 0.5 };
  // Centre the focus point, but never pan past the picture's edges.
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const left = clamp(50 - scale * f.x * 100, 100 - scale * 100, 0);
  const top = clamp(50 - scale * f.y * 100, 100 - scale * 100, 0);
  const points = ZOOM_LEVELS.length - level;

  return (
    <div className="zoom-game">
      <div className="zoom-stage-wrap" ref={stageRef}>
        {item ? (
          <>
            <div className="zoom-meta">
              <span>
                Picture {index + 1} of {deck.length}
              </span>
              <span>
                Clue {level + 1} of {ZOOM_LEVELS.length}
                {!revealed && (
                  <>
                    {" "}
                    · worth <b>{points}</b> point{points === 1 ? "" : "s"}
                  </>
                )}
              </span>
            </div>
            <div className="zoom-stage">
              {focusReady && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={item.id}
                  src={item.src}
                  alt={revealed ? item.name : "Mystery item, zoomed in"}
                  className={item.builtin ? "zoom-img vector" : "zoom-img"}
                  style={{ width: `${scale * 100}%`, height: `${scale * 100}%`, left: `${left}%`, top: `${top}%` }}
                  draggable={false}
                />
              )}
              {revealed && <div className="zoom-answer">{item.name}</div>}
            </div>
            <div className="actions">
              {!revealed ? (
                <>
                  <button className="btn primary" onClick={zoomOut} disabled={level === lastLevel}>
                    Zoom out
                  </button>
                  <button className="btn" onClick={reveal}>
                    Reveal answer
                  </button>
                </>
              ) : (
                <button className="btn primary" onClick={next}>
                  Next picture
                </button>
              )}
              <button className="btn ghost small" onClick={toggleFullscreen}>
                ⛶ Big screen
              </button>
            </div>
            <p className="muted center small-print">Keys: Space = zoom out · Enter = reveal · → = next picture</p>
          </>
        ) : (
          <div className="empty">
            <p className="big-emoji" aria-hidden="true">🔍</p>
            <p>No pictures yet — turn on the built-in set or add your own photos below.</p>
          </div>
        )}
      </div>

      <details className="zoom-manage">
        <summary>
          Manage pictures ({pool.length} in play)
        </summary>
        <label className="check">
          <input type="checkbox" checked={useBuiltins} onChange={(e) => toggleBuiltins(e.target.checked)} />
          Include the {DEFAULT_ZOOM_ITEMS.length} built-in winter pictures
        </label>
        <p className="muted small-print">
          Add your own photos (office objects, the CEO’s mug, the venue…). They’re stored in this browser only, so add them on the laptop
          that will run the game. The answer is taken from the file name; edit it below.
        </p>
        <label className="btn small upload-btn">
          + Add photos
          <input type="file" accept="image/*" multiple hidden onChange={addPhotos} />
        </label>
        {note && <p className="note">{note}</p>}
        {custom.length > 0 && (
          <ul className="zoom-list">
            {custom.map((c) => (
              <li key={c.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.src} alt="" />
                <input
                  value={c.name}
                  aria-label="Answer"
                  onChange={(e) => updateCustom(custom.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x)))}
                />
                <button className="link danger" onClick={() => updateCustom(custom.filter((x) => x.id !== c.id))}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="muted small-print">Built-in pictures: Twemoji by Twitter, CC-BY 4.0.</p>
      </details>
    </div>
  );
}
