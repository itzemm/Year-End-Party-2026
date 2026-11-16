"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

// Camera QR scanner. Calls onScan(text) for each code it reads (the same code is
// ignored for a few seconds so one ticket isn't checked in repeatedly).
export default function QrScanner({ onScan, paused = false }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const lastRef = useRef({ text: "", at: 0 });
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const [state, setState] = useState("off"); // off | starting | on | error
  const [error, setError] = useState("");

  function stop() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setState("off");
  }

  async function start() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setState("error");
      setError("This browser can’t use the camera here. Use the manual check-in below (camera needs a secure https page).");
      return;
    }
    setState("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } }, audio: false });
      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();
      setState("on");
    } catch (err) {
      setState("error");
      setError(
        err?.name === "NotAllowedError"
          ? "Camera permission was blocked. Allow camera access for this site in your browser settings, then try again."
          : err?.name === "NotFoundError"
            ? "No camera found on this device. Use the manual check-in below."
            : `Couldn’t start the camera (${err?.message || err}).`
      );
    }
  }

  // Read frames while the camera is on.
  useEffect(() => {
    if (state !== "on") return;
    let raf;
    let last = 0;
    const tick = (t) => {
      raf = requestAnimationFrame(tick);
      if (t - last < 180 || pausedRef.current) return; // ~5 scans a second is plenty
      last = t;
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;
      const scale = Math.min(1, 640 / video.videoWidth);
      const w = Math.round(video.videoWidth * scale);
      const h = Math.round(video.videoHeight * scale);
      const canvas = canvasRef.current;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(video, 0, 0, w, h);
      const code = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "attemptBoth" });
      if (!code?.data) return;
      const now = Date.now();
      if (code.data === lastRef.current.text && now - lastRef.current.at < 4000) return;
      lastRef.current = { text: code.data, at: now };
      onScanRef.current(code.data);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state]);

  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  return (
    <div className="scanner">
      <div className={`scanner-view ${state}`}>
        <video ref={videoRef} playsInline muted />
        <canvas ref={canvasRef} hidden />
        {state === "on" && <span className="scanner-frame" aria-hidden="true" />}
        {state !== "on" && (
          <div className="scanner-idle">
            <span className="big-emoji" aria-hidden="true">
              📷
            </span>
            {state === "starting" ? <p>Starting camera…</p> : <p>Point the camera at a guest’s ticket QR code.</p>}
          </div>
        )}
      </div>
      <div className="actions">
        {state === "on" ? (
          <button className="btn ghost" onClick={stop}>
            Stop camera
          </button>
        ) : (
          <button className="btn primary big" onClick={start} disabled={state === "starting"}>
            📷 Start scanning
          </button>
        )}
      </div>
      {error && <p className="note error-text center">{error}</p>}
    </div>
  );
}
