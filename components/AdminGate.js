"use client";

import { useState } from "react";
import { fetchStatus, setPasscode } from "@/lib/store";

// Asks for the admin password (ADMIN_PASSCODE) and remembers it in this browser.
export function PasscodeGate({ title = "Admins only" }) {
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  const [checking, setChecking] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setChecking(true);
    setMessage("");
    try {
      setPasscode(value.trim());
      const status = await fetchStatus();
      if (!status.authorized) setMessage("That password isn’t right — try again.");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setChecking(false);
    }
  }

  return (
    <section className="panel empty login-panel">
      <p className="big-emoji" aria-hidden="true">🔮</p>
      <h2 className="panel-title">{title}</h2>
      <p className="muted">Enter the admin password to continue.</p>
      <form className="gate-form" onSubmit={submit}>
        <input type="password" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Admin password" autoFocus autoComplete="current-password" />
        <button className="btn primary" type="submit" disabled={checking}>
          Unlock
        </button>
      </form>
      {message && <p className="note error-text">{message}</p>}
    </section>
  );
}
