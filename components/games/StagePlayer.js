"use client";

import { useEffect, useState } from "react";
import { Confetti } from "@/components/Confetti";
import { fetchMe, fetchStage } from "@/lib/store";
import { usePolling } from "@/lib/hooks";

// Guests' view of Spotlight: who's called up, the question, and the winners.
export default function StagePlayer() {
  const { data: s } = usePolling(fetchStage, () => 2000);
  const [myTicket, setMyTicket] = useState(null);
  useEffect(() => {
    fetchMe()
      .then((d) => setMyTicket(d?.guest?.ticketNo || null))
      .catch(() => {});
  }, []);

  if (s === undefined) return <p className="muted center">Shaking the snow globe…</p>;
  if (s.status === "idle") {
    return (
      <div className="panel-inner empty">
        <p className="big-emoji" aria-hidden="true">🎤</p>
        <p>Waiting for the host to call the first names up on stage…</p>
      </div>
    );
  }
  const onStage = s.contestants.some((c) => c.ticketNo === myTicket);
  const iWon = s.winners.includes(myTicket);

  return (
    <div className="panel-inner stage-view">
      {s.status === "winners" && <Confetti key={`${s.round}-${s.winners.join()}`} />}
      <p className="eyebrow">Round {s.round}</p>
      {onStage && s.status !== "winners" && <p className="stage-callout">🌟 You’re on stage! Head up to the front now.</p>}
      {iWon && <p className="stage-callout won">🏆 You won this round!</p>}
      <StageQuestion question={s.question} />
      <StageContestants contestants={s.contestants} winners={s.winners} meTicket={myTicket} />
    </div>
  );
}

export function StageQuestion({ question, big = false }) {
  return (
    <div className={`stage-question ${question ? "shown" : ""} ${big ? "big" : ""}`}>
      <small>The question</small>
      <b>{question || "Coming up…"}</b>
    </div>
  );
}

export function StageContestants({ contestants, winners = [], meTicket, onToggle, selected, onReplace, big = false }) {
  return (
    <div className={`stage-cards ${big ? "big" : ""}`}>
      {contestants.map((c, i) => {
        const won = winners.includes(c.ticketNo);
        const sel = selected?.includes(c.ticketNo);
        const Tag = onToggle ? "button" : "div";
        return (
          <Tag
            key={c.ticketNo}
            className={`stage-card ${won ? "winner" : ""} ${sel ? "selected" : ""} ${c.ticketNo === meTicket ? "me" : ""}`}
            onClick={onToggle ? () => onToggle(c.ticketNo) : undefined}
            style={{ animationDelay: `${i * 0.25}s` }}
          >
            <span className="stage-avatar" aria-hidden="true">
              {won ? "🏆" : "⭐"}
            </span>
            <b>{c.name}</b>
            <small className="mono">{c.ticketNo}</small>
            {c.ticketNo === meTicket && <em>That’s you!</em>}
            {onReplace && (
              <span
                role="button"
                tabIndex={0}
                className="link small-print stage-replace"
                onClick={(e) => {
                  e.stopPropagation();
                  onReplace(c.ticketNo);
                }}
              >
                ↻ not here
              </span>
            )}
          </Tag>
        );
      })}
    </div>
  );
}
