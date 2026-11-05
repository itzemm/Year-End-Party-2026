"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { characterFor } from "@/lib/characters";

export const QR_OPTIONS = {
  margin: 1,
  width: 360,
  errorCorrectionLevel: "L",
  color: { dark: "#1b1033", light: "#fffaf0" },
};

export default function TicketCard({ guest, url, compact = false }) {
  const [qr, setQr] = useState("");
  const char = characterFor(guest.character);

  useEffect(() => {
    if (!url) return;
    QRCode.toDataURL(url, QR_OPTIONS).then(setQr).catch(() => setQr(""));
  }, [url]);

  return (
    <article className={`ticket ${compact ? "compact" : ""}`}>
      <div className="corner tl">
        <b>{char.suit}</b>
        <small>{char.suit}</small>
      </div>
      <div className="corner br">
        <b>{char.suit}</b>
        <small>{char.suit}</small>
      </div>

      <p className="ticket-eyebrow">You are cordially invited to</p>
      <h3 className="ticket-title">The Mad Tea Party</h3>
      <p className="ticket-sub">Year End Party 2026</p>

      <div className="ticket-body">
        {url && (
          <div className="qr-frame">
            {qr ? <img src={qr} alt={`QR code for ticket ${guest.ticketNo}`} /> : <div className="qr-loading">Brewing…</div>}
          </div>
        )}
        <dl className="ticket-details">
          <dt>Guest</dt>
          <dd className="guest-name">{guest.name}</dd>
          {guest.team && (
            <>
              <dt>Team</dt>
              <dd>{guest.team}</dd>
            </>
          )}
          {guest.table && (
            <>
              <dt>Table</dt>
              <dd>{guest.table}</dd>
            </>
          )}
          <dt>Arriving as</dt>
          <dd>
            {char.emoji} {char.name}
          </dd>
        </dl>
      </div>

      {guest.message && <p className="ticket-message">“{guest.message}”</p>}

      <div className="ticket-stub">
        <span>Lucky Draw No.</span>
        <strong>{guest.ticketNo}</strong>
      </div>
    </article>
  );
}
