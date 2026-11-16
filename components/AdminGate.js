"use client";

import { useState } from "react";
import { fetchStatus, setDeskPasscode, setPasscode } from "@/lib/store";

// Asks for a password and remembers it in this browser.
// role "admin": the admin area (ADMIN_PASSCODE). role "desk": the front desk (REGISTRATION_PASSCODE).
export function PasscodeGate({ title = "Admins only", role = "admin" }) {
  const desk = role === "desk";
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  const [checking, setChecking] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setChecking(true);
    setMessage("");
    try {
      (desk ? setDeskPasscode : setPasscode)(value.trim());
      const status = await fetchStatus();
      if (!(desk ? status.deskAuthorized : status.authorized)) setMessage("That password isn’t right — try again.");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setChecking(false);
    }
  }

  return (
    <section className="panel empty login-panel">
      <p className="big-emoji" aria-hidden="true">{desk ? "🎫" : "🔮"}</p>
      <h2 className="panel-title">{title}</h2>
      <p className="muted">
        {desk ? "Enter the registration password." : "Enter the game admin password."}
      </p>
      <form className="gate-form" onSubmit={submit}>
        <input type="password" value={value} onChange={(e) => setValue(e.target.value)} placeholder={desk ? "Registration password" : "Game admin password"} autoFocus autoComplete="current-password" />
        <button className="btn primary" type="submit" disabled={checking}>
          Unlock
        </button>
      </form>
      {message && <p className="note error-text">{message}</p>}
    </section>
  );
}
