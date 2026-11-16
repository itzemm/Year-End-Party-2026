// "How to play" card, shown on the big screen before a game starts and on guests'
// phones while they wait.
export const RULES = {
  stage: {
    title: "Spotlight",
    icon: "🎤",
    rules: [
      "5 names are drawn at random — if your name appears, come up to the stage!",
      "The host reveals a fun question, like “Who has the longest hair?”",
      "The host checks and picks the winner (or winners).",
      "Nobody is called up twice, so everyone gets a chance.",
    ],
  },
  zoom: {
    title: "Guess the Item",
    icon: "🔍",
    rules: [
      "There are 5 mystery pictures, shown one at a time.",
      "Each picture starts as a close-up and zooms out every 10 seconds (3 times).",
      "Type what you think it is on your phone — you can change your answer until it locks, 15 seconds after the full picture shows.",
      "The most correct answers wins; ties go to whoever answered fastest. The top 3 are the winners!",
    ],
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
    </div>
  );
}
