"use client";

import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import TicketCard, { QR_OPTIONS } from "@/components/TicketCard";
import { fetchMe, login, logout, ticketUrl } from "@/lib/store";

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
        <HelpButton />
        <LoginForm onLoggedIn={load} initialError={error} />
      </div>
    );

  const { guest, wins } = me;

  async function downloadQr() {
    const dataUrl = await QRCode.toDataURL(ticketUrl(guest), { ...QR_OPTIONS, width: 1024 });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${guest.ticketNo}-ticket-qr.png`;
    a.click();
  }

  return (
    <div className="ticket-page">
      <HelpButton />
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

      <TicketCard guest={guest} url={ticketUrl(guest)} />

      <div className="actions">
        <button className="btn" onClick={downloadQr}>
          Save QR to phone
        </button>
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
      <p className="muted center small-print">Show this QR code at the door. Your lucky draw number is {guest.ticketNo}.</p>
    </div>
  );
}

const HELP_TEXT = "If you are unable to find your name, find Patricia Yeo or go to the registration booth for assistance.";

// Round "?" button that shows who to ask for help.
function HelpButton() {
  const [open, setOpen] = useState(false);
  return (
    <div className="help-wrap">
      <button type="button" className="help-btn" aria-label="Help" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        ?
      </button>
      {open && (
        <p className="help-bubble" role="note">
          {HELP_TEXT}
        </p>
      )}
    </div>
  );
}

function LoginForm({ onLoggedIn, initialError }) {
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState("");
  const [names, setNames] = useState(null); // null = not searched yet
  const [code, setCode] = useState("");
  const [error, setError] = useState(initialError || "");
  const [busy, setBusy] = useState(false);

  // Suggest matching names as the guest types (after 2 letters).
  useEffect(() => {
    if (chosen || query.trim().replace(/\s/g, "").length < 2) {
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
  }, [query, chosen]);

  async function submit(e) {
    e.preventDefault();
    const identifier = chosen || query;
    if (!identifier.trim()) return setError("Find your name first");
    setBusy(true);
    setError("");
    try {
      await login(identifier, code);
      // Came here from a game? Go straight back to it.
      const next = new URLSearchParams(window.location.search).get("next");
      if (next && next.startsWith("/") && !next.startsWith("//")) {
        window.location.href = next;
        return;
      }
      await onLoggedIn();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel login-panel">
      <p className="big-emoji" aria-hidden="true">🗝️</p>
      <h2 className="panel-title">Find your ticket</h2>
      <p className="muted">Find your name, then enter the access code from your invitation.</p>
      <form className="form" onSubmit={submit}>
        <label>
          Your name <small className="muted">(first name, then last name)</small>
          {chosen ? (
            <span className="chosen-name">
              <b>{chosen}</b>
              <button type="button" className="link" onClick={() => (setChosen(""), setQuery(""))}>
                Not you?
              </button>
            </span>
          ) : (
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Holly Winters"
              autoComplete="off"
              autoCapitalize="words"
              autoFocus
            />
          )}
        </label>
        {!chosen && names && (
          <ul className="name-results" role="listbox" aria-label="Matching names">
            {names.map((n) => (
              <li key={n}>
                <button type="button" onClick={() => (setChosen(n), setNames(null))}>
                  {n}
                </button>
              </li>
            ))}
            {names.length === 0 && <li className="muted name-none">No name found. {HELP_TEXT}</li>}
          </ul>
        )}
        <label>
          Access code
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. K7MPQ2"
            autoComplete="one-time-code"
            autoCapitalize="characters"
            className="code-input"
            required
          />
        </label>
        {error && <p className="note error-text">{error}</p>}
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? "Turning the key…" : "Open my ticket"}
        </button>
      </form>
      <p className="muted small-print">Lost your code? Ask at the registration booth — they can look it up or issue a new one.</p>
    </section>
  );
}
