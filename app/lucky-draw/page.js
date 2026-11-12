"use client";

import { useEffect, useState } from "react";
import { Confetti } from "@/components/Confetti";
import { fetchLucky, fetchMe } from "@/lib/store";
import { usePolling, useServerNow } from "@/lib/hooks";

// Guests see the prize being drawn for, and who won once the wheel stops.
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
  const { prize, drawing, winner } = data;
  const spinning = drawing && !winner && now < drawing.revealAt + 3000;
  const isMe = winner && winner.ticketNo === myTicket;

  return (
    <div className="stack">
      <section className="panel lucky-public">
        {winner && <Confetti key={winner.ticketNo + (prize?.id || "")} />}
        <h2 className="panel-title">🎁 The Snowflake Lucky Draw</h2>
        {!prize ? (
          <div className="empty">
            <p className="big-emoji" aria-hidden="true">🎁</p>
            <p>The next prize will appear here. Keep your ticket handy!</p>
          </div>
        ) : (
          <div className="lucky-public-body">
            <p className="eyebrow">Now drawing for</p>
            {prize.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={prize.imageUrl} alt="" className="prize-img" />
            ) : (
              <div className="prize-img placeholder">🎁</div>
            )}
            <h3 className="prize-name">{prize.name}</h3>
            {winner ? (
              <div className={`winner-card ${isMe ? "me" : ""}`}>
                <small>{isMe ? "That’s you! 🎉 Collect your prize" : "And the winner is…"}</small>
                <b>{winner.name}</b>
                <span className="mono">{winner.ticketNo}</span>
              </div>
            ) : spinning ? (
              <div className="spinning-note">
                <span className="mini-wheel" aria-hidden="true" />
                The wheel is spinning…
              </div>
            ) : (
              <p className="muted">Waiting for the wheel to spin…</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
