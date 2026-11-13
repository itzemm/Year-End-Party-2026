// Each team's chain: sentence → drawings → final guess, shown at the end.
const pct = (m) => `${Math.round(m * 100)}%`;

export default function TelReveal({ chains, teams, sentence, big = false, audienceTop, audienceCount = 0, myGuess, meTicket }) {
  return (
    <div className={`tel-reveal ${big ? "big" : ""}`}>
      <div className={`tel-sentence ${sentence ? "shown" : ""}`}>
        <small>The secret sentence</small>
        <b>{sentence ? `“${sentence}”` : "???"}</b>
      </div>
      {chains.map((chain, t) => {
        const last = chain[chain.length - 1];
        return (
          <section key={t} className="tel-chain">
            <h3>
              {teams[t].name}
              <span className="tel-final">
                Final answer: <b>{last.text ? `“${last.text}”` : "(no answer)"}</b>
                {sentence && last.match !== undefined && <span className="match-pill">{pct(last.match)} match</span>}
              </span>
            </h3>
            <div className="tel-steps">
              {chain.map((step, s) => (
                <figure key={s} className={`tel-step ${step.type}`}>
                  {step.type === "guess" ? (
                    <div className="tel-guess">{step.text ? `“${step.text}”` : "(no answer)"}</div>
                  ) : step.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={step.imageUrl} alt={`Drawing by ${step.name}`} />
                  ) : (
                    <div className="tel-missing">(no drawing)</div>
                  )}
                  <figcaption>
                    {s + 1}. {step.name}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        );
      })}
      {audienceCount > 0 && (
        <section className="tel-audience">
          <h3>🕵️ The audience ({audienceCount} guess{audienceCount === 1 ? "" : "es"})</h3>
          {sentence && audienceTop?.length ? (
            <ol className="leaderboard">
              {audienceTop.map((a, i) => (
                <li key={a.ticketNo} className={`${i === 0 && a.match > 0 ? "champion" : ""} ${a.ticketNo === meTicket ? "me" : ""}`}>
                  <span className="lb-rank">{i === 0 && a.match > 0 ? "👑" : i + 1}</span>
                  <span className="lb-name">
                    {a.name}
                    <small className="audience-guess">“{a.text}”</small>
                  </span>
                  <span className="lb-score">{pct(a.match)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted center">Closest audience guesses are shown with the secret sentence.</p>
          )}
          {myGuess && <p className="muted center small-print">Your guess: “{myGuess.text}”</p>}
        </section>
      )}
    </div>
  );
}
