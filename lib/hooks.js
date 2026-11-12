"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchStatus } from "./store";

// ---- server clock ------------------------------------------------------------------
// Phones' clocks can be minutes off, so timers count against the server's clock.
let offset = 0;
let synced = null;
function syncClock() {
  synced ??= (async () => {
    try {
      const t0 = Date.now();
      const { now } = await fetch("/api/time", { cache: "no-store" }).then((r) => r.json());
      offset = now - (t0 + Date.now()) / 2;
    } catch {
      /* fall back to the device clock */
    }
  })();
  return synced;
}
export const serverNow = () => Date.now() + offset;

// Re-renders every `intervalMs` with the current server time (only while `active`).
export function useServerNow(intervalMs = 250, active = true) {
  const [now, setNow] = useState(() => serverNow());
  useEffect(() => {
    syncClock().then(() => setNow(serverNow()));
  }, []);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(serverNow()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs, active]);
  return now;
}

// ---- polling -------------------------------------------------------------------------
// Calls `fetcher` now and then again after `delayFor(data)` ms (slower when the tab is
// hidden). `refresh()` fetches immediately.
export function usePolling(fetcher, delayFor) {
  const [data, setData] = useState(undefined);
  const [error, setError] = useState("");
  const timer = useRef(null);
  const latest = useRef({ fetcher, delayFor });
  latest.current = { fetcher, delayFor };
  const seq = useRef(0);

  const tick = useCallback(async () => {
    clearTimeout(timer.current);
    const mine = ++seq.current;
    let result;
    try {
      result = await latest.current.fetcher();
      if (mine === seq.current) {
        setData(result);
        setError("");
      }
    } catch (err) {
      if (mine === seq.current) setError(err.message || "Connection hiccup — retrying…");
    }
    if (mine !== seq.current) return;
    const hidden = typeof document !== "undefined" && document.visibilityState !== "visible";
    const delay = hidden ? 20000 : latest.current.delayFor(result);
    timer.current = setTimeout(tick, delay);
  }, []);

  useEffect(() => {
    tick();
    const onVisible = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      seq.current++;
      clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [tick]);

  return { data, error, refresh: tick, setData };
}

// ---- admin status --------------------------------------------------------------------
export function useAdminStatus() {
  const [status, setStatus] = useState(null);
  useEffect(() => {
    const check = () => fetchStatus().then(setStatus).catch(() => setStatus({ authorized: false, authRequired: true }));
    check();
    window.addEventListener("wonderland-store", check);
    return () => window.removeEventListener("wonderland-store", check);
  }, []);
  return status;
}
