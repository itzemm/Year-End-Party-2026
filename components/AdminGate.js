"use client";

import { useState } from "react";
import { fetchStatus, setPasscode } from "@/lib/store";

// Shown instead of a page when ADMIN_PASSCODE is set and this browser hasn't entered it.
export function PasscodeGate() {
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  const [checking, setChecking] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setChecking(true);
    setMessage("");
    try {
      setPasscode(value.trim()); // also triggers the page to reload its data
      const status = await fetchStatus();
      if (!status.authorized) setMessage("That passcode didn’t fit the lock — try again.");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setChecking(false);
    }
  }

  return (
    <section className="panel empty">
      <p className="big-emoji" aria-hidden="true">🗝️</p>
      <p>This door is locked. Enter the organisers’ passcode to continue.</p>
      <form className="gate-form" onSubmit={submit}>
        <input type="password" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Passcode" autoFocus />
        <button className="btn primary" type="submit" disabled={checking}>
          Drink me
        </button>
      </form>
      {message && <p className="note error-text">{message}</p>}
    </section>
  );
}

export function StorageNotice({ status, error }) {
  if (error) return <p className="banner error">{error}</p>;
  if (status?.storage === "memory") {
    return (
      <p className="banner error">
        ⚠️ No database connected — registrations are only kept in temporary server memory and <b>will be lost</b>. In Vercel, connect
        Upstash Redis to this project (Storage tab) and redeploy before registering anyone.
      </p>
    );
  }
  return null;
}
