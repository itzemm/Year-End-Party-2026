"use client";

import { useEffect, useState } from "react";
import { ZOOM_SCALES } from "@/lib/rules";

// Shows the picture at the given zoom level. Each new level "zooms out" from the
// previous one. If a level isn't available yet (clock edge), it retries shortly.
export default function ZoomStage({ imageBase, level, answer, children }) {
  const [shown, setShown] = useState([]); // levels successfully loaded

  useEffect(() => setShown([]), [imageBase]);

  const levels = imageBase ? Array.from({ length: level + 1 }, (_, l) => l) : [];
  const top = shown.length ? Math.max(...shown) : -1;

  return (
    <div className="zoom-stage">
      {levels.map((l) => (
        <StageImage
          key={`${imageBase}-${l}`}
          src={`${imageBase}&level=${l}`}
          visible={l === top}
          entering={l === top && l > 0}
          fromScale={l > 0 ? ZOOM_SCALES[l - 1] / ZOOM_SCALES[l] : 1}
          onReady={() => setShown((s) => (s.includes(l) ? s : [...s, l]))}
        />
      ))}
      {top < 0 && <div className="zoom-placeholder">❄</div>}
      {answer && <div className="zoom-answer">{answer}</div>}
      {children}
    </div>
  );
}

function StageImage({ src, visible, entering, fromScale, onReady }) {
  const [attempt, setAttempt] = useState(0);
  const url = attempt ? `${src}&retry=${attempt}` : src;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      draggable={false}
      className={`zoom-img ${visible ? "visible" : ""} ${entering ? "entering" : ""}`}
      style={{ "--from": fromScale }}
      onLoad={onReady}
      onError={() => attempt < 20 && setTimeout(() => setAttempt((a) => a + 1), 700)}
    />
  );
}
