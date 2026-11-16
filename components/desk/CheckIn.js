"use client";

import { useRef, useState } from "react";
import QrScanner from "./QrScanner";
import { PasscodeGate } from "@/components/AdminGate";
import { checkIn, parseScannedCode, undoCheckIn } from "@/lib/store";
import { useStore } from "@/lib/useStore";

const timeOf = (iso) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

// A short sound so staff know a scan worked without looking at the screen.
function beep(ok) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = ok ? 880 : 220;
    gain.gain.value = 0.15;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (ok ? 0.15 : 0.4));
    navigator.vibrate?.(ok ? 80 : [60, 60, 60]);
  } catch {
    /* no audio — fine */
  }
}

export default function CheckIn() {
  const { guests, ready, needsPasscode } = useStore();
  const [result, setResult] = useState(null); // { kind: ok|already|error, guest?, message }
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState([]);
  const resultTimer = useRef(null);

  function show(r) {
    setResult(r);
    beep(r.kind === "ok");
    clearTimeout(resultTimer.current);
    resultTimer.current = setTimeout(() => setResult(null), 6000);
  }

  async function doCheckIn(who) {
    setBusy(true);
    try {
      const { guest, already } = await checkIn(who);
      show(
        already
          ? { kind: "already", guest, message: `Already checked in at ${timeOf(guest.checkedInAt)}` }
          : { kind: "ok", guest, message: "Checked in — welcome!" }
      );
      if (!already) setRecent((r) => [guest, ...r.filter((g) => g.id !== guest.id)].slice(0, 6));
    } catch (err) {
      show({ kind: "error", message: err.message });
    } finally {
      setBusy(false);
    }
  }

  function onScan(text) {
    const who = parseScannedCode(text);
    if (!who) return show({ kind: "error", message: "That QR code isn’t a Winter Wonderland ticket" });
    doCheckIn(who);
  }

  async function undo(guest) {
    if (!confirm(`Undo check-in for ${guest.name}?`)) return;
    try {
      await undoCheckIn(guest.id);
      setRecent((r) => r.filter((g) => g.id !== guest.id));
      if (result?.guest?.id === guest.id) setResult(null);
    } catch (err) {
      show({ kind: "error", message: err.message });
    }
  }

  if (needsPasscode) return <PasscodeGate title="Front desk" role="desk" />;

  const checkedIn = guests.filter((g) => g.checkedInAt).length;
  const q = query.trim().toLowerCase();
  const matches = q ? guests.filter((g) => `${g.name} ${g.ticketNo}`.toLowerCase().includes(q)).slice(0, 8) : [];

  return (
    <div className="stack">
      <section className="panel checkin-stats">
        <div>
          <b>{checkedIn}</b>
          <span>checked in</span>
        </div>
        <div>
          <b>{guests.length - checkedIn}</b>
          <span>still to arrive</span>
        </div>
        <div>
          <b>{guests.length}</b>
          <span>registered</span>
        </div>
      </section>

      <section className="grid-2">
        <div className="panel">
          <h2 className="panel-title">📷 Scan tickets</h2>
          <QrScanner onScan={onScan} paused={busy} />
        </div>

        <div className="panel checkin-side">
          {result ? (
            <div className={`checkin-result ${result.kind}`} role="status">
              <span className="checkin-icon" aria-hidden="true">
                {result.kind === "ok" ? "✅" : result.kind === "already" ? "⚠️" : "❌"}
              </span>
              {result.guest && <b className="checkin-name">{result.guest.name}</b>}
              {result.guest && <span className="mono">{result.guest.ticketNo}</span>}
              <span>{result.message}</span>
            </div>
          ) : (
            <div className="checkin-result idle">
              <span className="checkin-icon" aria-hidden="true">
                🎟️
              </span>
              <span>Scan a ticket or search below — the result shows here.</span>
            </div>
          )}

          <h3 className="sun-heading">✍️ Manual check-in</h3>
          <input className="search wide" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or ticket number…" />
          {q && (
            <ul className="checkin-list">
              {matches.length === 0 && <li className="muted">No registered guest matches “{query}”.</li>}
              {matches.map((g) => (
                <li key={g.id}>
                  <span>
                    <b>{g.name}</b> <span className="mono muted">{g.ticketNo}</span>
                  </span>
                  {g.checkedInAt ? (
                    <span className="checkin-done">
                      <span className="in-pill">✓ {timeOf(g.checkedInAt)}</span>
                      <button className="link danger small-print" onClick={() => undo(g)}>
                        Undo
                      </button>
                    </span>
                  ) : (
                    <button className="btn small primary" onClick={() => doCheckIn({ id: g.id, ticketNo: g.ticketNo })} disabled={busy}>
                      Check in
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {!ready && <p className="muted">Loading guest list…</p>}

          {recent.length > 0 && (
            <>
              <h3 className="sun-heading">Just checked in (this device)</h3>
              <ul className="checkin-list">
                {recent.map((g) => (
                  <li key={g.id}>
                    <span>
                      <b>{g.name}</b> <span className="mono muted">{g.ticketNo}</span>
                    </span>
                    <span className="checkin-done">
                      <span className="in-pill">✓ {timeOf(g.checkedInAt)}</span>
                      <button className="link danger small-print" onClick={() => undo(g)}>
                        Undo
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
