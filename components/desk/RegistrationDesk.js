"use client";

import { useRef, useState } from "react";
import TicketCard from "@/components/TicketCard";
import { addGuest, exportGuestsExcel, importGuestsFile, inviteMessage, removeGuest } from "@/lib/store";
import { useStore } from "@/lib/useStore";

export default function RegistrationDesk() {
  const { guests, ready } = useStore();
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
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
    if (!first.trim() || !last.trim() || saving) return;
    setSaving(true);
    setFormError("");
    try {
      // Stored as "First Last" — the way guests search for their name on My Ticket.
      setLatest(await addGuest({ name: `${first.trim()} ${last.trim()}` }));
      setFirst("");
      setLast("");
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

  async function handleRemove(g) {
    if (!confirm(`Remove ${g.name}’s ticket?`)) return;
    try {
      await removeGuest(g.id);
      if (latest?.id === g.id) setLatest(null);
    } catch (err) {
      setNote(`Couldn’t remove ${g.name}: ${err.message}`);
    }
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
          <p className="muted">
            Type the guest’s first and last name. They get a ticket with a lucky draw number, and find it on My Ticket by searching for{" "}
            <b>First name Last name</b>.
          </p>
          <form className="form" onSubmit={handleSubmit}>
            <div className="row">
              <label>
                First name
                <input ref={nameRef} required value={first} onChange={(e) => setFirst(e.target.value)} placeholder="Holly" maxLength={40} autoFocus autoComplete="off" />
              </label>
              <label>
                Last name
                <input required value={last} onChange={(e) => setLast(e.target.value)} placeholder="Winters" maxLength={40} autoComplete="off" />
              </label>
            </div>
            {formError && <p className="note error-text">{formError}</p>}
            <button className="btn primary" type="submit" disabled={saving}>
              {saving ? "Creating ticket…" : "Create ticket"}
            </button>
          </form>
        </div>

        <div className="panel ticket-panel">
          {latest ? (
            <>
              <TicketCard guest={latest} />
              <div className="actions">
                <button className="btn small primary" onClick={() => copyInvite(latest)}>
                  {copied ? "Copied!" : "Copy invite message"}
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
            <span className="checked-count">
              ✓ {guests.filter((g) => g.checkedInAt).length} checked in
            </span>
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
                  <th>Checked in</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((g) => (
                  <tr key={g.id}>
                    <td className="mono">{g.ticketNo}</td>
                    <td>{g.name}</td>
                    <td>
                      {g.checkedInAt ? (
                        <span className="in-pill">✓ {new Date(g.checkedInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      ) : (
                        <span className="muted">Not yet</span>
                      )}
                    </td>
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
