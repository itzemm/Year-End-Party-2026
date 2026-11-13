// Each team's chain: sentence → drawings → final guess, shown at the end.
export default function TelReveal({ chains, teams, sentence, big = false }) {
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
    </div>
  );
}
