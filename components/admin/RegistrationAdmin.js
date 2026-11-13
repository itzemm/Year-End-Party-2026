"use client";

import { useRef, useState } from "react";
import QRCode from "qrcode";
import TicketCard, { QR_OPTIONS } from "@/components/TicketCard";
import { addGuest, exportGuestsExcel, importGuestsFile, inviteMessage, removeGuest, resetCode, ticketUrl } from "@/lib/store";
import { useStore } from "@/lib/useStore";

export default function RegistrationAdmin() {
  const { guests, ready } = useStore();
  const [name, setName] = useState("");
  const [latest, setLatest] = useState(null);
  const [query, setQuery] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [copied, setCopied] = useState(false);
  const fileRef = useRef(null);
  const nameRef = useRef(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    setFormError("");
    try {
      setLatest(await addGuest({ name }));
      setName("");
      nameRef.current?.focus(); // ready for the next guest
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

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

  async function handleRemove(g) {
    if (!confirm(`Remove ${g.name}’s ticket?`)) return;
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
    try {
      const n = await exportGuestsExcel();
      setNote(`Exported ${n} guests to Excel.`);
    } catch (err) {
      setNote(`Couldn’t export: ${err.message}`);
    }
  }

  async function handleImport(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const r = await importGuestsFile(file);
      const parts = [
        r.created && `${r.created} new guest${r.created === 1 ? "" : "s"} registered`,
        r.updated && `${r.updated} existing updated`,
        r.restored && `${r.restored} restored`,
        r.skipped && `${r.skipped} row${r.skipped === 1 ? "" : "s"} skipped (unrecognised ticket number)`,
      ].filter(Boolean);
      setNote(`Import done: ${parts.join(", ") || "nothing to change"}.`);
    } catch (err) {
      setNote(`Couldn’t read that file: ${err.message}`);
    }
  }

  const filtered = guests.filter((g) => `${g.name} ${g.ticketNo}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="stack">
      <section className="grid-2">
        <div className="panel">
          <h2 className="panel-title">🎟️ Register a guest</h2>
          <p className="muted">Type the guest’s name. They get a ticket with a QR code, a lucky draw number and an access code to log in.</p>
          <form className="form" onSubmit={handleSubmit}>
            <label>
              Guest name
              <input ref={nameRef} required value={name} onChange={(e) => setName(e.target.value)} placeholder="Holly Winters" maxLength={80} autoFocus />
            </label>
            {formError && <p className="note error-text">{formError}</p>}
            <button className="btn primary" type="submit" disabled={saving}>
              {saving ? "Creating ticket…" : "Create ticket"}
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
                  <span className="muted">Name</span> {latest.name}
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
                <button className="btn ghost" onClick={() => window.print()}>
                  Print
                </button>
              </div>
            </>
          ) : (
            <div className="empty">
              <p className="big-emoji" aria-hidden="true">⛄</p>
              <p>The new ticket will appear here.</p>
            </div>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">
            📜 Guest list <span className="count">{guests.length}</span>
          </h2>
          <div className="actions">
            <input className="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or ticket…" />
            <button className="btn small" onClick={handleExport} disabled={!guests.length}>
              ⬇ Export to Excel
            </button>
            <button className="btn small" onClick={() => fileRef.current?.click()} title="Excel export, a list of names in Excel, or an old .json backup">
              ⬆ Import
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.json,application/json"
              hidden
              onChange={handleImport}
            />
          </div>
        </div>
        {note && <p className="note">{note}</p>}
        {!ready ? null : guests.length === 0 ? (
          <p className="muted">No guests yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="guest-table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Name</th>
                  <th>Access code</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((g) => (
                  <tr key={g.id}>
                    <td className="mono">{g.ticketNo}</td>
                    <td>{g.name}</td>
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
