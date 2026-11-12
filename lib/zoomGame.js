// Guess the Item — live game. The admin uploads 5 pictures (pre-cut into 4 zoom
// levels in their browser) with answers. During a round the server only hands out
// the zoom levels the clock has reached, so nobody can peek at the full picture.
import "server-only";
import { kv, httpError } from "./kv";
import { checkDataUrl, version } from "./images";
import { randomId } from "./db";
import { ZOOM_LOCK_MS, ZOOM_ROUNDS, ZOOM_STEPS, isCorrectAnswer, rankStandings, splitAnswers, zoomPhase } from "./rules";

const K = {
  items: "wl26:zoom:items", // hash: slot -> { slot, answer, alternatives, version }
  img: (slot, level) => `wl26:zoom:img:${slot}:${level}`,
  state: "wl26:zoom:state",
  answers: (gameId, round) => `wl26:zoom:ans:${gameId}:${round}`,
  reveal: (gameId, round) => `wl26:zoom:reveal:${gameId}:${round}`,
};
const LEVELS = ZOOM_STEPS + 1;
const GRACE_MS = 750; // network delay allowance for answers sent right at the buzzer
// The answer is only revealed (and the round scored) once late answers can no longer arrive.
const REVEAL_MS = ZOOM_LOCK_MS + GRACE_MS + 250;
const TOP = 10;

const IDLE = { status: "idle" };

export async function getZoomState() {
  return (await kv.get(K.state)) || IDLE;
}

// ---- admin: pictures ---------------------------------------------------------------
export async function listZoomItems() {
  const all = (await kv.hgetall(K.items)) || {};
  return Array.from({ length: ZOOM_ROUNDS }, (_, slot) => all[slot] || null);
}

function assertNotRunning(state) {
  if (state.status === "playing" || state.status === "leaderboard") {
    throw httpError("Finish or reset the game before changing pictures", 409);
  }
}

export async function saveZoomItem(slot, { answer, alternatives, images }) {
  if (!Number.isInteger(slot) || slot < 0 || slot >= ZOOM_ROUNDS) throw httpError("Unknown picture slot", 400);
  assertNotRunning(await getZoomState());
  const cleanAnswer = String(answer || "").trim().slice(0, 60);
  if (!cleanAnswer) throw httpError("Type the answer for this picture", 400);
  const existing = await kv.hget(K.items, String(slot));
  if (!images && !existing) throw httpError("Upload a picture for this round", 400);
  const item = {
    slot,
    answer: cleanAnswer,
    alternatives: String(alternatives || "").trim().slice(0, 200),
    version: existing?.version || version(),
  };
  if (images) {
    if (!Array.isArray(images) || images.length !== LEVELS) throw httpError("Picture upload was incomplete", 400);
    images.forEach(checkDataUrl);
    for (let level = 0; level < LEVELS; level++) await kv.set(K.img(slot, level), images[level]);
    item.version = version();
  }
  await kv.hset(K.items, { [slot]: item });
  return item;
}

export async function deleteZoomItem(slot) {
  assertNotRunning(await getZoomState());
  await kv.hdel(K.items, String(slot));
  await kv.del(...Array.from({ length: LEVELS }, (_, l) => K.img(slot, l)));
}

// ---- admin: running the game --------------------------------------------------------------
async function computeStandings(state, throughRound) {
  const items = await listZoomItems();
  const byGuest = new Map();
  for (let r = 0; r <= throughRound; r++) {
    const accepted = splitAnswers(items[r]?.answer, items[r]?.alternatives);
    const answers = (await kv.hgetall(K.answers(state.gameId, r))) || {};
    for (const [guestId, a] of Object.entries(answers)) {
      const row = byGuest.get(guestId) || { guestId, name: a.name, ticketNo: a.ticketNo, correct: 0, timeMs: 0, answered: 0 };
      row.answered++;
      if (isCorrectAnswer(a.text, accepted)) {
        row.correct++;
        row.timeMs += a.atMs;
      }
      byGuest.set(guestId, row);
    }
  }
  return rankStandings([...byGuest.values()]);
}

export async function zoomControl(action) {
  const state = await getZoomState();
  const now = Date.now();
  let next;
  if (action === "start") {
    const items = await listZoomItems();
    const missing = items.map((it, i) => (it ? null : i + 1)).filter(Boolean);
    if (missing.length) throw httpError(`Add pictures for round${missing.length > 1 ? "s" : ""} ${missing.join(", ")} first`, 400);
    if (state.status === "playing" || state.status === "leaderboard") throw httpError("A game is already running", 409);
    next = { gameId: randomId(), status: "playing", round: 0, startedAt: now };
  } else if (action === "next") {
    if (state.status === "playing") {
      if (now - state.startedAt < REVEAL_MS) throw httpError("Wait until the answer is revealed", 409);
      const standings = await computeStandings(state, state.round);
      const last = state.round >= ZOOM_ROUNDS - 1;
      next = { ...state, status: last ? "final" : "leaderboard", standings };
    } else if (state.status === "leaderboard") {
      next = { gameId: state.gameId, status: "playing", round: state.round + 1, startedAt: now };
    } else {
      throw httpError("Nothing to move on to", 409);
    }
  } else if (action === "stop") {
    // End the game now. Only pictures whose answer was already revealed count; the
    // picture in progress is dropped and its answer stays hidden.
    if (state.status !== "playing" && state.status !== "leaderboard") throw httpError("No game is running", 409);
    const revealed = state.status === "leaderboard" || now - state.startedAt >= REVEAL_MS;
    const completed = revealed ? state.round : state.round - 1;
    next =
      completed < 0
        ? { status: "stopped", gameId: state.gameId }
        : { gameId: state.gameId, status: "final", round: completed, stoppedEarly: completed < ZOOM_ROUNDS - 1, standings: await computeStandings(state, completed) };
  } else if (action === "reset") {
    next = IDLE;
  } else {
    throw httpError("Unknown action", 400);
  }
  await kv.set(K.state, next);
  return next;
}

// ---- players ------------------------------------------------------------------------------------
export async function submitZoomAnswer(guest, text) {
  const state = await getZoomState();
  const clean = String(text || "").trim().slice(0, 60);
  if (!clean) throw httpError("Type your guess first", 400);
  if (state.status !== "playing") throw httpError("No picture is being played right now", 409);
  const atMs = Date.now() - state.startedAt;
  if (atMs > ZOOM_LOCK_MS + GRACE_MS) throw httpError("Time’s up — answers are locked", 409);
  const entry = { text: clean, atMs: Math.min(atMs, ZOOM_LOCK_MS), name: guest.name, ticketNo: guest.ticketNo };
  await kv.hset(K.answers(state.gameId, state.round), { [guest.id]: entry });
  return { round: state.round, entry };
}

// Answer + how many got it right, worked out once per round after the lock.
async function getReveal(state, items) {
  const key = K.reveal(state.gameId, state.round);
  let reveal = await kv.get(key);
  if (!reveal) {
    const item = items[state.round];
    const accepted = splitAnswers(item?.answer, item?.alternatives);
    const answers = Object.values((await kv.hgetall(K.answers(state.gameId, state.round))) || {});
    reveal = { answer: item?.answer || "?", correct: answers.filter((a) => isCorrectAnswer(a.text, accepted)).length, total: answers.length };
    await kv.set(key, reveal, { ex: 60 * 60 * 24 });
  }
  return reveal;
}

// Screens add `&level=N` themselves when the clock reaches each zoom level.
const imageBase = (item, gameId) => (item ? `/api/zoom/image?slot=${item.slot}&g=${gameId}&v=${item.version}` : null);

// The shared state every screen polls. Answers stay server-side until the lock.
export async function getZoomPublic() {
  const state = await getZoomState();
  const now = Date.now();
  const out = { status: state.status, rounds: ZOOM_ROUNDS, now };
  if (state.status === "idle" || state.status === "stopped") return out;
  out.stoppedEarly = Boolean(state.stoppedEarly);
  const items = await listZoomItems();
  out.round = state.round;
  out.startedAt = state.startedAt;
  out.gameId = state.gameId;
  out.imageBase = imageBase(items[state.round], state.gameId);
  if (state.status === "playing") {
    const phase = zoomPhase(now - state.startedAt);
    out.answerCount = await kv.hlen(K.answers(state.gameId, state.round));
    if (phase.locked && now - state.startedAt >= REVEAL_MS) out.reveal = await getReveal(state, items);
  } else {
    out.reveal = await getReveal(state, items);
    out.leaderboard = (state.standings || []).slice(0, TOP).map(({ guestId, ...row }) => row);
    out.players = state.standings?.length || 0;
  }
  return out;
}

export async function getZoomMe(guest) {
  const state = await getZoomState();
  if (state.status === "idle" || state.status === "stopped") return { status: state.status };
  const entry = await kv.hget(K.answers(state.gameId, state.round), guest.id);
  const locked = state.status !== "playing" || Date.now() - state.startedAt >= REVEAL_MS;
  const out = { gameId: state.gameId, round: state.round, status: state.status, entry: entry || null };
  if (locked && entry) {
    const item = await kv.hget(K.items, String(state.round));
    out.correct = isCorrectAnswer(entry.text, splitAnswers(item?.answer, item?.alternatives));
  }
  if (state.standings) out.standing = state.standings.find((s) => s.guestId === guest.id) || null;
  return out;
}

// Only hand out zoom levels the game has reached.
export async function getZoomImage(slot, level, { admin = false } = {}) {
  if (!admin) {
    const state = await getZoomState();
    if (state.status === "idle" || state.status === "stopped") return null;
    if (slot > state.round) return null;
    if (slot === state.round && state.status === "playing" && level > zoomPhase(Date.now() - state.startedAt).level) return null;
  }
  return kv.get(K.img(slot, level));
}
