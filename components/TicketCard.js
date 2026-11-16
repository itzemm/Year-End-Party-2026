import { characterFor } from "@/lib/characters";

// The guest's invitation: name and lucky draw number (no QR code).
export default function TicketCard({ guest }) {
  const char = characterFor(guest.character);
  return (
    <article className="ticket">
      <div className="corner tl">
        <b>{char.mark}</b>
        <small>{char.mark}</small>
      </div>
      <div className="corner br">
        <b>{char.mark}</b>
        <small>{char.mark}</small>
      </div>

      <p className="ticket-eyebrow">You are cordially invited to</p>
      <h3 className="ticket-title">The Winter Ball</h3>
      <p className="ticket-sub">Year End Party 2026</p>

      <div className="ticket-body">
        <p className="ticket-guest">{guest.name}</p>
      </div>

      <div className="ticket-stub">
        <span>Lucky Draw No.</span>
        <strong>{guest.ticketNo}</strong>
      </div>
    </article>
  );
}
