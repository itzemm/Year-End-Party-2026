const fmtTime = (ms) => `${(ms / 1000).toFixed(1)}s`;

// Guess the Item standings: most correct first, then fastest total time.
export default function Leaderboard({ rows, rounds, final = false, meTicket, big = false }) {
  if (!rows?.length) return <p className="muted center">No answers yet.</p>;
  return (
    <ol className={`leaderboard ${big ? "big" : ""}`}>
      {rows.map((r) => (
        <li key={r.ticketNo} className={`${r.rank === 1 && final ? "champion" : ""} ${r.ticketNo === meTicket ? "me" : ""}`}>
          <span className="lb-rank">{r.rank === 1 && final ? "👑" : r.rank}</span>
          <span className="lb-name">{r.name}</span>
          <span className="lb-score">
            {r.correct}/{rounds}
          </span>
          <span className="lb-time">{r.correct ? fmtTime(r.timeMs) : "—"}</span>
        </li>
      ))}
    </ol>
  );
}

export { fmtTime };
