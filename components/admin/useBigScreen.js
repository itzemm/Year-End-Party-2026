"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// "Big screen" mode for host views: goes full screen and scales the whole view up so it
// fills 90% of the projector (width or height, whichever runs out first) — so every
// font, picture and button grows with it. Re-fits whenever the content changes size.
const MIN_W = 560;
const MAX_W = 1280;

export function useBigScreen() {
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const [full, setFull] = useState(false);
  const [scale, setScale] = useState(1);
  const [width, setWidth] = useState(960); // layout width before scaling

  useEffect(() => {
    const onChange = () => setFull(document.fullscreenElement === outerRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    if (!full) return;
    const inner = innerRef.current;
    let tries = 0;
    const fit = () => {
      // offsetWidth/Height are the unscaled layout size.
      const w = inner.offsetWidth || 1;
      const h = inner.offsetHeight || 1;
      const sw = window.innerWidth * 0.9;
      const sh = window.innerHeight * 0.9;
      // Reshape the layout towards the screen's proportions so the content can grow
      // until it fills 90% in both directions as far as possible (a few passes).
      if (tries < 4) {
        const ideal = Math.round(Math.min(MAX_W, Math.max(MIN_W, Math.sqrt(w * h * (sw / sh)))));
        if (Math.abs(ideal - w) / w > 0.08) {
          tries++;
          setWidth(ideal);
          return; // the ResizeObserver calls fit() again after the re-layout
        }
      }
      setScale(Math.min(sw / w, sh / h));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(inner);
    const onResize = () => {
      tries = 0;
      fit();
    };
    window.addEventListener("resize", onResize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [full]);

  const toggle = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen();
    else outerRef.current?.requestFullscreen?.();
  }, []);

  return {
    outerRef,
    innerRef,
    full,
    toggle,
    innerProps: {
      ref: innerRef,
      className: `fit-inner ${full ? "fitted" : ""}`,
      // Centred on the screen whatever its size (grid centring stops working once the
      // unscaled layout is taller than the screen).
      style: full ? { width: `${width}px`, transform: `translate(-50%, -50%) scale(${scale})` } : undefined,
    },
  };
}

export function BigScreenButton({ big }) {
  return (
    <button className="btn small ghost" onClick={big.toggle}>
      {big.full ? "✕ Exit big screen" : "⛶ Big screen"}
    </button>
  );
}
