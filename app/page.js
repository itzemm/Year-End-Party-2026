"use client";

import { useRef, useState } from "react";
import QRCode from "qrcode";
import TicketCard, { QR_OPTIONS } from "@/components/TicketCard";
import { CHARACTERS } from "@/lib/characters";
import { addGuest, exportData, importData, inviteMessage, removeGuest, resetCode, ticketUrl } from "@/lib/store";
import { useStore } from "@/lib/useStore";
import { PasscodeGate, StorageNotice } from "@/components/AdminGate";

const EMPTY = { name: "", email: "", team: "", table: "", character: CHARACTERS[0].name, dietary: "", message: "" };

export default function RegistrationPage() {
  const { guests, ready, status, error, needsPasscode } = useStore();
  const [form, setForm] = useState(EMPTY);
  const [latest, setLatest] = useState(null);
  const [query, setQuery] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [copied, setCopied] = useState(false);

  async function copyInvite(guest) {
    try {
      await navigator.clipboard.writeText(inviteMessage(guest));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this invitation:", inviteMessage(guest));
    }
  }

  async function handleResetCode(guest) {
    if (!confirm(`Issue a new access code for ${guest.name}? Their old code will stop working and they’ll be logged out.`)) return;
    try {
      setLatest(await resetCode(guest.id));
    } catch (err) {
      setNote(`Couldn’t reset the code: ${err.message}`);
    }
  }
  const fileRef = useRef(null);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || saving) return;
    setSaving(true);
    setFormError("");
    try {
      setLatest(await addGuest(form));
      setForm(EMPTY);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(g) {
    if (!confirm(`Off with ${g.name}’s ticket?`)) return;
    try {
      await removeGuest(g.id);
      if (latest?.id === g.id) setLatest(null);
    } catch (err) {
      setNote(`Couldn’t remove ${g.name}: ${err.message}`);
    }
  }

  async function downloadQr(guest) {
    const dataUrl = await QRCode.toDataURL(ticketUrl(guest), { ...QR_OPTIONS, width: 1024 });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${guest.ticketNo}-${guest.name.replace(/\s+/g, "_")}.png`;
    a.click();
  }

  async function handleExport() {
    const blob = new Blob([await exportData()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `wonderland-guests-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const count = await importData(await file.text());
      setNote(`Imported ${count} guests through the looking glass.`);
    } catch (err) {
      setNote(`Couldn’t read that file: ${err.message}`);
    }
    e.target.value = "";
  }

  const filtered = guests.filter((g) =>
    `${g.name} ${g.ticketNo} ${g.team} ${g.email}`.toLowerCase().includes(query.toLowerCase())
  );

  if (needsPasscode) return <PasscodeGate />;

  return (
    <div className="stack">
      <StorageNotice status={status} error={error} />
      <section className="grid-2">
        <div className="panel">
          <h2 className="panel-title">
            <span aria-hidden="true">🎟️</span> Issue an Invitation
          </h2>
          <p className="muted">
              Fill in what should appear on the ticket. Each guest gets a unique QR code, a lucky draw number and an access code to see
              their ticket on the My Ticket tab.
            </p>

          <form className="form" onSubmit={handleSubmit}>
            <label>
              Guest name *
              <input required value={form.name} onChange={update("name")} placeholder="Alice Liddell" />
            </label>
            <div className="row">
              <label>
                Email
                <input type="email" value={form.email} onChange={update("email")} placeholder="alice@wonderland.co" />
              </label>
              <label>
                Team / Department
                <input value={form.team} onChange={update("team")} placeholder="Tea Party Planning" />
              </label>
            </div>
            <div className="row">
              <label>
                Table
                <input value={form.table} onChange={update("table")} placeholder="Hearts 7" />
              </label>
              <label>
                Arriving as
                <select value={form.character} onChange={update("character")}>
                  {CHARACTERS.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.emoji} {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Dietary needs
              <input value={form.dietary} onChange={update("dietary")} placeholder="Eat Me cakes only, please" />
            </label>
            <label>
              Message on ticket
              <input value={form.message} onChange={update("message")} maxLength={80} placeholder="Why is a raven like a writing desk?" />
            </label>
            {formError && <p className="note error-text">{formError}</p>}
            <button className="btn primary" type="submit" disabled={saving}>
              {saving ? "Brewing your ticket…" : <>Generate ticket &amp; QR</>}
            </button>
          </form>
        </div>

        <div className="panel ticket-panel">
          {latest ? (
            <>
              <TicketCard guest={latest} url={ticketUrl(latest)} />
              <div className="login-box">
                <p className="login-box-title">Guest login</p>
                <p>
                  <span className="muted">{latest.email ? "Email" : "Ticket no."}</span> {latest.email || latest.ticketNo}
                </p>
                <p>
                  <span className="muted">Access code</span> <strong className="code">{latest.accessCode}</strong>
                </p>
                <div className="actions">
                  <button className="btn small primary" onClick={() => copyInvite(latest)}>
                    {copied ? "Copied!" : "Copy invite message"}
                  </button>
                  <button className="btn small ghost" onClick={() => handleResetCode(latest)}>
                    New code
                  </button>
                </div>
              </div>
              <div className="actions">
                <button className="btn" onClick={() => downloadQr(latest)}>
                  Download QR
                </button>
                <a className="btn" href={ticketUrl(latest)} target="_blank" rel="noreferrer">
                  Open ticket page
                </a>
                <button className="btn ghost" onClick={() => window.print()}>
                  Print
                </button>
              </div>
            </>
          ) : (
            <div className="empty">
              <p className="big-emoji" aria-hidden="true">🐇</p>
              <p>“I’m late, I’m late!” — the next ticket will appear here.</p>
            </div>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">
            <span aria-hidden="true">📜</span> Guest List <span className="count">{guests.length}</span>
          </h2>
          <div className="actions">
            <input className="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or ticket…" />
            <button className="btn small" onClick={handleExport} disabled={!guests.length}>
              Export
            </button>
            <button className="btn small" onClick={() => fileRef.current?.click()}>
              Import
            </button>
            <input ref={fileRef} type="file" accept="application/json" hidden onChange={handleImport} />
          </div>
        </div>
        {note && <p className="note">{note}</p>}

        {!ready ? null : guests.length === 0 ? (
          <p className="muted">No guests yet. The tea is getting cold.</p>
        ) : (
          <div className="table-wrap">
            <table className="guest-table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Name</th>
                  <th>Team</th>
                  <th>Table</th>
                  <th>Character</th>
                  <th>Code</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((g) => (
                  <tr key={g.id}>
                    <td className="mono">{g.ticketNo}</td>
                    <td>{g.name}</td>
                    <td>{g.team || "—"}</td>
                    <td>{g.table || "—"}</td>
                    <td>{g.character}</td>
                    <td className="mono">{g.accessCode}</td>
                    <td className="row-actions">
                      <button className="link" onClick={() => setLatest(g)}>
                        View
                      </button>
                      <button className="link danger" onClick={() => handleRemove(g)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
