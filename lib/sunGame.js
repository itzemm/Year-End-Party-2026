// Smallest Unique Number — guests have 1 minute to pick 1–100. Then the chests of
// numbers somebody picked light up, and the admin opens them (any order) to show who
// picked each one.
import "server-only";
import { kv, httpError } from "./kv";
import { SUN_DURATION_MS, SUN_MAX, sunStandings } from "./rules";

const K = {
  round: "wl26:sun:round",
  entries: (id) => `wl26:sun:entries:${id}`, // hash guestId -> { n, name, ticketNo }
  picks: (id) => `wl26:sun:picks:${id}`, // { n: [names] } frozen when the reveal starts
  opened: (id) => `wl26:sun:opened:${id}`, // hash n -> [names]
};
const GRACE_MS = 750;
const WEEK = 60 * 60 * 24 * 7;

const getRound = async () => (await kv.get(K.round)) || null;

// "open" while the 2 minutes run, "locked" after, "revealing" once chests start opening.
const phaseOf = (round, now = Date.now()) =>
  round.status === "stopped" ? "stopped" : round.status === "revealing" ? "revealing" : now < round.endsAt ? "open" : "locked";

export async function sunControl(action, body = {}) {
  const round = await getRound();
  const now = Date.now();
  if (action === "start") {
    const next = { id: (round?.id || 0) + 1, status: "open", startedAt: now, endsAt: now + SUN_DURATION_MS };
    await kv.set(K.round, next);
    return next;
  }
  if (!round) throw httpError("Start a round first", 400);
  if (action === "stop") {
    // Cancel the round: picks are no longer accepted and no winner is declared.
    const next = { ...round, status: "stopped", stoppedAt: now };
    await kv.set(K.round, next);
    return next;
  }
  if (round.status === "stopped") throw httpError("This round was stopped — start a new one", 409);
  if (action === "endNow") {
    // Everyone has picked: lock the numbers now instead of waiting for the timer.
    if (round.status !== "open" || now >= round.endsAt) return round;
    const next = { ...round, endsAt: now };
    await kv.set(K.round, next);
    return next;
  }
  if (action === "reveal") {
    if (round.status === "revealing") return round;
    if (now < round.endsAt + GRACE_MS) throw httpError("Wait for the timer to finish", 409);
    const entries = Object.values((await kv.hgetall(K.entries(round.id))) || {});
    const picks = {};
    for (const e of entries) (picks[e.n] ||= []).push(e.name);
    await kv.set(K.picks(round.id), picks, { ex: WEEK });
    const picked = Object.keys(picks).map(Number).sort((a, b) => a - b);
    const next = { ...round, status: "revealing", total: entries.length, picked };
    await kv.set(K.round, next);
    return next;
  }
  if (round.status !== "revealing") throw httpError("Start the reveal first", 409);
  if (action === "open") {
    // Open any lit chest (a number somebody picked). Opening it again is harmless.
    const n = Number(body.n);
    if (!round.picked.includes(n)) throw httpError(`Nobody picked ${n}`, 400);
    const picks = (await kv.get(K.picks(round.id))) || {};
    await kv.hset(K.opened(round.id), { [n]: picks[n] || [] });
    await kv.expire(K.opened(round.id), WEEK);
    return round;
  }
  throw httpError("Unknown action", 400);
}

// A round is open, locked, or being revealed without a result yet.
export async function sunInProgress() {
  const round = await getRound();
  if (!round) return false;
  const phase = phaseOf(round);
  if (phase === "open" || phase === "locked") return true;
  if (phase !== "revealing") return false;
  const st = sunStandings((await kv.hgetall(K.opened(round.id))) || {}, round.picked);
  return !st.winner && !st.noWinner;
}

export async function submitSunEntry(guest, n) {
  const round = await getRound();
  if (!round || round.status !== "open" || Date.now() > round.endsAt + GRACE_MS) {
    throw httpError("Time’s up — numbers are locked.", 409);
  }
  if (!Number.isInteger(n) || n < 1 || n > SUN_MAX) throw httpError(`Pick a whole number from 1 to ${SUN_MAX}.`, 400);
  const entry = { n, name: guest.name, ticketNo: guest.ticketNo };
  await kv.hset(K.entries(round.id), { [guest.id]: entry });
  await kv.expire(K.entries(round.id), WEEK);
  return { round, entry };
}

export async function getSunPublic() {
  const round = await getRound();
  const now = Date.now();
  if (!round) return { round: null, now };
  const phase = phaseOf(round, now);
  const out = { id: round.id, phase, startedAt: round.startedAt, endsAt: round.endsAt };
  if (phase === "revealing") {
    const opened = (await kv.hgetall(K.opened(round.id))) || {};
    out.total = round.total;
    out.picked = round.picked;
    out.opened = opened;
    out.standings = sunStandings(opened, round.picked);
  } else {
    out.entryCount = await kv.hlen(K.entries(round.id));
  }
  return { round: out, now };
}

export async function getSunMe(guest) {
  const round = await getRound();
  const entry = round ? await kv.hget(K.entries(round.id), guest.id) : null;
  return { roundId: round?.id ?? null, entry: entry || null };
}
