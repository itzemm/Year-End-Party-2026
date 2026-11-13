// Game rules shared by the server and the screens (no secrets in here).

// Rehearsal/testing knob: NEXT_PUBLIC_GAME_SPEED=5 at build time runs every timer
// 5× faster. Leave it unset for the real party.
const SPEED = Math.max(1, Number(process.env.NEXT_PUBLIC_GAME_SPEED) || 1);
const ms = (n) => Math.round(n / SPEED);

// ---- Lucky draw -----------------------------------------------------------------
export const SPIN_MS = ms(9000); // how long the wheel spins before the winner is shown

// ---- Guess the Item ---------------------------------------------------------------
export const ZOOM_ROUNDS = 5;
export const ZOOM_STEP_MS = ms(10_000); // zoom out every 10 seconds…
export const ZOOM_STEPS = 3; // …three times, ending on the full picture
export const ZOOM_FULL_MS = ZOOM_STEP_MS * ZOOM_STEPS; // full picture shows at 30s
export const ZOOM_LOCK_MS = ZOOM_FULL_MS + ms(15_000); // answers lock (and reveal) at 45s
export const ZOOM_SCALES = [4, 2.6, 1.6, 1]; // how far zoomed in each level is (1 = full)

export function zoomPhase(elapsedMs) {
  if (elapsedMs >= ZOOM_LOCK_MS) return { level: ZOOM_STEPS, locked: true, nextAt: null };
  const level = Math.min(ZOOM_STEPS, Math.max(0, Math.floor(elapsedMs / ZOOM_STEP_MS)));
  const nextAt = level < ZOOM_STEPS ? (level + 1) * ZOOM_STEP_MS : ZOOM_LOCK_MS;
  return { level, locked: false, nextAt };
}

// Forgiving answer check: ignores case, punctuation, "a/an/the", plurals and small typos.
export function normalizeAnswer(text) {
  return String(text || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(a|an|the)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w))
    .join(" ");
}

function editDistance(a, b) {
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

// `accepted` = the answer plus any alternatives the admin typed (comma separated).
export function isCorrectAnswer(guess, accepted) {
  const g = normalizeAnswer(guess);
  if (!g) return false;
  return accepted.some((answer) => {
    const a = normalizeAnswer(answer);
    if (!a) return false;
    if (g === a) return true;
    if (` ${g} `.includes(` ${a} `)) return true; // "red coffee mug" for "coffee mug"
    const allowed = a.length >= 8 ? 2 : a.length >= 4 ? 1 : 0;
    return allowed > 0 && editDistance(g, a) <= allowed;
  });
}

export const splitAnswers = (answer, alternatives) =>
  [answer, ...String(alternatives || "").split(",")].map((s) => s.trim()).filter(Boolean);

// Ranking: most correct answers first, then the fastest total time on those answers.
export function rankStandings(rows) {
  return rows
    .sort((a, b) => b.correct - a.correct || a.timeMs - b.timeMs || a.name.localeCompare(b.name))
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

// ---- Smallest Unique Number --------------------------------------------------------------
export const SUN_MAX = 100;
export const SUN_DURATION_MS = ms(120_000); // 2 minutes to pick
// Chests are opened 50 → 1 on page 1, then 51 → 100 on page 2.
export const SUN_PAGES = [
  Array.from({ length: 50 }, (_, i) => 50 - i),
  Array.from({ length: 50 }, (_, i) => 51 + i),
];

// From the chests opened so far: the smallest number with exactly one picker, and
// whether it's certain to win (every smaller number has already been opened).
export function sunStandings(opened) {
  // opened: { [n]: names[] }
  const nums = Object.keys(opened)
    .map(Number)
    .sort((a, b) => a - b);
  const uniqueN = nums.find((n) => opened[n].length === 1);
  const current = uniqueN ? { n: uniqueN, name: opened[uniqueN][0] } : null;
  let decided = false;
  if (current) {
    decided = true;
    for (let k = 1; k < current.n; k++) if (!(k in opened)) decided = false;
  }
  const allOpened = nums.length >= SUN_MAX;
  return { current, winner: decided ? current : null, noWinner: allOpened && !current };
}

// ---- Broken Telephone --------------------------------------------------------------------
export const TEL_TEAMS = 3;
export const TEL_TEAM_SIZE = 5;
export const TEL_TEAM_NAMES = ["Team Snowflake", "Team Icicle", "Team Aurora"];
export const TEL_FIRST_MS = ms(60_000); // person 1 draws the sentence
export const TEL_NEXT_MS = ms(30_000); // everyone after copies (or guesses, for the last person)
export const TEL_GRACE_MS = 4000; // drawings sent right at the buzzer still count

export const telDuration = (step) => (step === 0 ? TEL_FIRST_MS : TEL_NEXT_MS);

// What the person at `step` does: draw the sentence, copy a drawing, or write a guess.
export function telTask(step, teamSize) {
  if (step === teamSize - 1) return "guess";
  return step === 0 ? "draw" : "copy";
}

// Where the game is, from the moderator-controlled state and the clock.
export function telPhase(state, now) {
  if (state.status !== "playing") return { kind: state.status, active: null };
  if (!state.endsAt) return { kind: "ready", active: state.step };
  if (now < state.endsAt) return { kind: "running", active: state.step };
  const next = state.step + 1;
  if (next >= state.teamSize) return { kind: "finished", active: null };
  // Time's up: highlight moves to the next person, waiting for the moderator.
  return { kind: "between", active: next, collecting: now < state.endsAt + TEL_GRACE_MS };
}

export const TEL_SENTENCES = [
  "A penguin ice-skating to work with a briefcase",
  "Santa stuck in the office printer",
  "A snowman melting during a budget meeting",
  "Reindeer having a coffee break on the roof",
  "The boss building a snow fort out of spreadsheets",
  "A polar bear doing karaoke at the year end party",
  "An elf losing the lucky draw ticket in the snow",
  "Hot chocolate volcano erupting on a sled",
  "A gingerbread man running from a hungry intern",
  "Skiing down a mountain of unread emails",
  "A cat wearing a scarf sitting on a laptop",
  "Fireworks shaped like a giant pizza",
];

// ---- Spotlight (on-stage game) ----------------------------------------------------------------
export const STAGE_PICK = 5; // names drawn per round
// Short and quick to judge on stage: the answer can be seen or checked in seconds.
export const STAGE_QUESTIONS = [
  "Who has the longest hair?",
  "Who is the tallest?",
  "Who has the biggest shoes?",
  "Who has the longest nails?",
  "Who has the lowest phone battery?",
  "Who has the most colourful outfit?",
  "Who is wearing the most jewellery?",
  "Who has the longest name?",
  "Whose birthday is closest to today?",
  "Who has the most keys on them?",
  "Who has the longest arm span?",
  "Who has the biggest smile?",
  "Who has the loudest laugh?",
  "Who has the best dance move?",
  "Who can jump the highest?",
  "Who is wearing the most layers?",
  "Who has the sparkliest outfit?",
  "Who has the most photos on their phone?",
  "Who does the best Santa “Ho ho ho”?",
  "Who can stand on one leg the longest?",
];

// How close a guess is to the secret sentence: the share of the sentence's key words
// (ignoring little words like "a", "the", "on") that appear in the guess. Small typos
// and plurals still count. 1 = every key word.
const SMALL_WORDS = new Set(["a", "an", "the", "of", "to", "on", "in", "at", "with", "and", "is", "are", "for", "from", "by", "out", "up", "into", "his", "her", "their", "its"]);
export function sentenceMatch(sentence, guess) {
  const keys = [...new Set(normalizeAnswer(sentence).split(" ").filter((w) => w && !SMALL_WORDS.has(w)))];
  const list = normalizeAnswer(guess).split(" ").filter(Boolean);
  // Also try adjacent words joined, so "brief case" counts for "briefcase".
  const words = new Set([...list, ...list.slice(1).map((w, i) => list[i] + w)]);
  if (!keys.length || !words.size) return 0;
  const hit = new Set(keys.filter((k) => words.has(k) || [...words].some((w) => k.length >= 5 && Math.abs(w.length - k.length) <= 1 && editDistance(w, k) <= 1)));
  // …and the other way round: "iceskating" counts for "ice" + "skating".
  keys.slice(1).forEach((k, i) => {
    if (words.has(keys[i] + k)) hit.add(keys[i]).add(k);
  });
  return hit.size / keys.length;
}

// Turns whose drawing is final (time's up and late uploads have arrived).
export function telStepsDone(state, now) {
  if (state.status !== "playing") return state.teamSize || 0;
  if (!state.endsAt) return state.step;
  return now >= state.endsAt + TEL_GRACE_MS ? state.step + 1 : state.step;
}
