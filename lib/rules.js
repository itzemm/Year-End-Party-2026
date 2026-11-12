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
