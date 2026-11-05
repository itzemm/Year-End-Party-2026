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
    // Keep lucky draw results fresh while the guest has the page open.
    const timer = setInterval(() => document.visibilityState === "visible" && fetchMe().then((d) => d && setMe(d)).catch(() => {}), 15000);
    return () => clearInterval(timer);
  }, [load]);

  if (me === undefined) return <p className="muted center">Falling down the rabbit hole…</p>;
  if (!me) return <LoginForm onLoggedIn={load} initialError={error} />;

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
      <p className="welcome">
        Welcome back, <b>{guest.name}</b>. Here is your invitation to the tea party.
      </p>

      {wins.length > 0 && (
        <div className="win-banner">
          <span aria-hidden="true">🏆</span>
          <div>
            <b>The Queen smiles upon you!</b>
            {wins.map((w) => (
              <p key={w.drawnAt}>You won {w.prize} in the lucky draw.</p>
            ))}
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

function LoginForm({ onLoggedIn, initialError }) {
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState(initialError || "");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(identifier, code);
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
      <p className="muted">Log in with the email (or ticket number) and access code from your invitation.</p>
      <form className="form" onSubmit={submit}>
        <label>
          Email or ticket number
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="alice@wonderland.co"
            autoComplete="username"
            autoCapitalize="none"
            required
          />
        </label>
        <label>
          Access code
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. K7MPQ2"
            autoComplete="current-password"
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
      <p className="muted small-print">Lost your code? Ask the organisers — they can look it up or issue a new one.</p>
    </section>
  );
}
