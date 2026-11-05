"use client";

import { useRef, useState } from "react";
import QRCode from "qrcode";
import TicketCard, { QR_OPTIONS } from "@/components/TicketCard";
import { CHARACTERS } from "@/lib/characters";
import { addGuest, exportData, importData, removeGuest, ticketUrl } from "@/lib/store";
import { useStore } from "@/lib/useStore";

const EMPTY = { name: "", email: "", team: "", table: "", character: CHARACTERS[0].name, dietary: "", message: "" };

export default function RegistrationPage() {
  const { guests, ready } = useStore();
  const [form, setForm] = useState(EMPTY);
  const [latest, setLatest] = useState(null);
  const [query, setQuery] = useState("");
  const [note, setNote] = useState("");
  const fileRef = useRef(null);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const guest = addGuest({
      ...form,
      name: form.name.trim(),
      email: form.email.trim(),
      team: form.team.trim(),
      table: form.table.trim(),
      message: form.message.trim(),
    });
    setLatest(guest);
    setForm(EMPTY);
  }

  async function downloadQr(guest) {
    const dataUrl = await QRCode.toDataURL(ticketUrl(guest), { ...QR_OPTIONS, width: 1024 });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${guest.ticketNo}-${guest.name.replace(/\s+/g, "_")}.png`;
    a.click();
  }

  function handleExport() {
    const blob = new Blob([exportData()], { type: "application/json" });
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
      const count = importData(await file.text());
      setNote(`Imported ${count} guests through the looking glass.`);
    } catch (err) {
      setNote(`Couldn’t read that file: ${err.message}`);
    }
    e.target.value = "";
  }

  const filtered = guests.filter((g) =>
    `${g.name} ${g.ticketNo} ${g.team} ${g.email}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="stack">
      <section className="grid-2">
        <div className="panel">
          <h2 className="panel-title">
            <span aria-hidden="true">🎟️</span> Issue an Invitation
          </h2>
          <p className="muted">Fill in what should appear on the ticket. Each guest gets a unique QR code and a lucky draw number.</p>

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
            <button className="btn primary" type="submit">
              Generate ticket &amp; QR
            </button>
          </form>
        </div>

        <div className="panel ticket-panel">
          {latest ? (
            <>
              <TicketCard guest={latest} url={ticketUrl(latest)} />
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
                    <td className="row-actions">
                      <button className="link" onClick={() => setLatest(g)}>
                        View
                      </button>
                      <button
                        className="link danger"
                        onClick={() => confirm(`Off with ${g.name}’s ticket?`) && removeGuest(g.id)}
                      >
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
