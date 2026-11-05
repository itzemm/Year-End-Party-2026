"use client";

import { useEffect, useState } from "react";
import { getGuests, getWinners } from "./store";

// Re-reads localStorage whenever the store changes (this tab or another tab).
export function useStore() {
  const [state, setState] = useState({ guests: [], winners: [], ready: false });

  useEffect(() => {
    const sync = () => setState({ guests: getGuests(), winners: getWinners(), ready: true });
    sync();
    window.addEventListener("wonderland-store", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("wonderland-store", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return state;
}
