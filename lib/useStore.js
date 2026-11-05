"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchGuests, fetchStatus, fetchWinners } from "./store";

const POLL_MS = 5000;

// Loads the shared guest list + winners, refreshes after local changes and
// polls every few seconds so other devices' registrations show up.
export function useStore() {
  const [state, setState] = useState({
    guests: [],
    winners: [],
    status: null,
    ready: false,
    needsPasscode: false,
    error: "",
  });
  const busy = useRef(false);
  const again = useRef(false);

  const refresh = useCallback(async () => {
    // If a load is already running, queue one more so fresh changes aren't missed.
    if (busy.current) {
      again.current = true;
      return;
    }
    busy.current = true;
    try {
      const status = await fetchStatus();
      if (status.authRequired && !status.authorized) {
        setState((s) => ({ ...s, status, ready: true, needsPasscode: true, error: "" }));
        return;
      }
      const [guests, winners] = await Promise.all([fetchGuests(), fetchWinners()]);
      setState({ guests, winners, status, ready: true, needsPasscode: false, error: "" });
    } catch (err) {
      setState((s) => ({ ...s, ready: true, error: `Couldn’t reach the guest list: ${err.message}` }));
    } finally {
      busy.current = false;
      if (again.current) {
        again.current = false;
        refresh();
      }
    }
  }, []);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener("wonderland-store", onChange);
    const timer = setInterval(() => document.visibilityState === "visible" && refresh(), POLL_MS);
    return () => {
      window.removeEventListener("wonderland-store", onChange);
      clearInterval(timer);
    };
  }, [refresh]);

  return { ...state, refresh };
}
