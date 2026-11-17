"use client";

import { useCallback, useEffect, useState } from "react";
import TicketCard from "@/components/TicketCard";
import { fetchMe, login, logout } from "@/lib/store";

export default function MyTicketPage() {
  const [me, setMe] = useState(undefined); // undefined = loading, null = logged out
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setMe(await fetchMe());
    } catch (err) {
      setError(err.message);
      setMe(null);
    }
  }, []);

  useEffect(() => {
    load();
    // Check for lucky draw wins once a minute while the page is visible. Kept slow on
    // purpose: 120 phones left open all evening should stay well within free tiers.
    const timer = setInterval(() => document.visibilityState === "visible" && fetchMe().then((d) => d && setMe(d)).catch(() => {}), 60000);
    // Also refresh straight away when the guest comes back to the tab.
    const onVisible = () => document.visibilityState === "visible" && fetchMe().then((d) => d && setMe(d)).catch(() => {});
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  if (me === undefined) return <p className="muted center">Shaking the snow globe…</p>;
  if (!me)
    return (
      <div className="stack">
        <LoginForm onLoggedIn={load} initialError={error} />
      </div>
    );

  const { guest, wins } = me;

  return (
    <div className="ticket-page">
      <p className="welcome">
        Welcome back, <b>{guest.name}</b>. Here is your invitation to the Winter Ball.
      </p>

      {wins.length > 0 && (
        <div className="win-banner">
          <span aria-hidden="true">🏆</span>
          <div>
            <b>Snowflakes smile upon you!</b>
            <p>You won the lucky draw — come and collect your prize!</p>
          </div>
        </div>
      )}

      <TicketCard guest={guest} />

      <div className="actions">
        <button
          className="btn ghost"
          onClick={async () => {
            await logout().catch(() => {});
            setMe(null);
          }}
        >
          Log out
        </button>
      </div>
      <p className="muted center small-print">Not you? Log out and find your own name. Your lucky draw number is {guest.ticketNo}.</p>
    </div>
  );
}

const HELP_TEXT = "Cannot find your name? Ask at the registration booth or find Patricia Yeo for help.";

function LoginForm({ onLoggedIn, initialError }) {
  const [query, setQuery] = useState("");
  const [names, setNames] = useState(null); // null = not searched yet
  const [error, setError] = useState(initialError || "");
  const [busy, setBusy] = useState(false);

  // Suggest matching names as the guest types (after 2 letters).
  useEffect(() => {
    if (query.trim().replace(/\s/g, "").length < 2) {
      setNames(null);
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/names?q=${encodeURIComponent(query.trim())}`)
        .then((r) => r.json())
        .then((d) => setNames(d.names || []))
        .catch(() => setNames([]));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  // Tapping your name opens your ticket.
  async function choose(person) {
    setBusy(true);
    setError("");
    try {
      await login(person.id);
      // Came here from a game? Go straight back to it.
      const next = new URLSearchParams(window.location.search).get("next");
      if (next && next.startsWith("/") && !next.startsWith("//")) {
        window.location.href = next;
        return;
      }
      await onLoggedIn();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <section className="panel login-panel">
      <p className="big-emoji" aria-hidden="true">🗝️</p>
      <h2 className="panel-title">Find your ticket</h2>
      <p className="muted">Search for your name and tap it.</p>
      <div className="form">
        <label>
          Your name <small className="muted">(first name, then last name)</small>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. Holly Winters" autoComplete="off" autoCapitalize="words" autoFocus />
        </label>
        {names && (
          <ul className="name-results" role="listbox" aria-label="Matching names">
            {names.map((n) => (
              <li key={n.id}>
                <button type="button" onClick={() => choose(n)} disabled={busy}>
                  {n.name}
                  {n.ticketNo && <small className="muted mono"> {n.ticketNo}</small>}
                </button>
              </li>
            ))}
            {names.length === 0 && <li className="muted name-none">No name found. {HELP_TEXT}</li>}
          </ul>
        )}
        {busy && <p className="muted center">Opening your ticket…</p>}
        {error && <p className="note error-text">{error}</p>}
      </div>
      <p className="help-line">
        <span className="help-icon" aria-hidden="true">
          ?
        </span>
        <span>{HELP_TEXT}</span>
      </p>
    </section>
  );
}
