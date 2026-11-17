export const ZOOM_HINT = "All the images are related to Christmas movies.";

// "How to play" card, shown on the big screen before a game starts and on guests'
// phones while they wait.
export const RULES = {
  stage: {
    title: "Spotlight",
    icon: "🎤",
    rules: [
      "5 names are drawn at random — if your name appears, come up to the stage!",
      "The host reveals a fun question, like “Who has the longest hair?”",
      "All players will reveal their answers.",
      "The host checks and picks the winner (or winners).",
    ],
  },
  zoom: {
    title: "Guess the Image",
    icon: "🔍",
    rules: [
      "Each picture shown starts as a close-up and zooms out every 10 seconds until the full picture is shown.",
      "Type what you think it is on your phone.",
      "The fastest and most accurate answers win!",
    ],
    hint: ZOOM_HINT,
  },
  sun: {
    title: "Smallest Unique Number",
    icon: "🔢",
    rules: [
      "You have 1 minute to pick a whole number from 1 to 100 on your phone.",
      "The winner is whoever picked the smallest number that nobody else picked.",
      "Every chosen number lights up a chest — the host opens them to reveal who picked what.",
      "Tip: 1 sounds clever… unless everyone else thinks so too!",
    ],
  },
};

export default function GameRules({ game, big = false }) {
  const r = RULES[game];
  if (!r) return null;
  return (
    <div className={`rules-card ${big ? "big" : ""}`}>
      <p className="rules-title">
        <span aria-hidden="true">{r.icon}</span> How to play {r.title}
      </p>
      <ol>
        {r.rules.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ol>
      {r.hint && <p className="rules-hint">💡 Hint: {r.hint}</p>}
    </div>
  );
}
