// The 3 teams as a table (one column per team, one row per turn). The person whose
// turn it is in every team is highlighted; ✓ marks people who have sent theirs.
export default function TelTeams({ teams, active, submitted = {}, meTicket, onReplace, canReplace }) {
  if (!teams?.length) return null;
  const rows = Math.max(...teams.map((t) => t.members.length));
  return (
    <div className="table-wrap">
      <table className="tel-table">
        <thead>
          <tr>
            <th className="tel-turn">#</th>
            {teams.map((t) => (
              <th key={t.name}>{t.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, s) => (
            <tr key={s} className={s === active ? "active" : ""}>
              <td className="tel-turn">
                {s + 1}
                <small>{s === 0 ? "draws" : s === rows - 1 ? "guesses" : "copies"}</small>
              </td>
              {teams.map((t, ti) => {
                const p = t.members[s];
                const done = submitted[`${ti}:${s}`];
                return (
                  <td key={ti} className={`${s === active ? "current" : ""} ${p?.ticketNo === meTicket ? "me" : ""}`}>
                    {p ? (
                      <span className="tel-person">
                        <span>
                          {p.name}
                          {p.ticketNo === meTicket && <em> (you)</em>}
                        </span>
                        {done && <span className="tel-done" title="Sent">✓</span>}
                        {onReplace && canReplace?.(s) && (
                          <button className="link small-print" title="Swap for another random guest" onClick={() => onReplace(ti, s)}>
                            ↻
                          </button>
                        )}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
