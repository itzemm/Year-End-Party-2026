"use client";

import { useEffect, useState } from "react";
import { Confetti } from "@/components/Confetti";
import { fetchLucky, fetchMe } from "@/lib/store";
import { usePolling, useServerNow } from "@/lib/hooks";

// Guests see the wheel spinning and who won.
export default function LuckyDrawPage() {
  const { data } = usePolling(fetchLucky, () => 2000);
  const [myTicket, setMyTicket] = useState(null);
  useEffect(() => {
    fetchMe()
      .then((d) => setMyTicket(d?.guest?.ticketNo || null))
      .catch(() => {});
  }, []);
  const spinningNow = Boolean(data?.drawing && !data.winner);
  const now = useServerNow(500, spinningNow);

  if (data === undefined) return <p className="muted center">Shaking the snow globe…</p>;
  const { drawing, winner } = data;
  const spinning = drawing && !winner && now < drawing.revealAt + 3000;
  const isMe = winner && winner.ticketNo === myTicket;

  return (
    <section className="panel lucky-public">
      {winner && <Confetti key={winner.ticketNo + drawing?.revealAt} />}
      <h2 className="panel-title">🎁 The Snowflake Lucky Draw</h2>
      <div className="lucky-public-body">
        {winner ? (
          <div className={`winner-card big ${isMe ? "me" : ""}`}>
            <small>{isMe ? "That’s you! 🎉 Come and collect your prize" : "And the winner is…"}</small>
            <b>{winner.name}</b>
            <span className="mono">{winner.ticketNo}</span>
          </div>
        ) : spinning ? (
          <div className="spinning-note">
            <span className="mini-wheel" aria-hidden="true" />
            The wheel is spinning…
          </div>
        ) : (
          <div className="empty">
            <p className="big-emoji" aria-hidden="true">🎁</p>
            <p>Watch the big screen — the winner will appear here when the wheel stops.</p>
          </div>
        )}
      </div>
    </section>
  );
}
