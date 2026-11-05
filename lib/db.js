// Server-only data layer. Uses Upstash Redis when its env vars are present
// (Vercel Marketplace → Upstash Redis sets KV_REST_API_URL / KV_REST_API_TOKEN),
// otherwise falls back to an in-memory store so `npm run dev` works offline.
import "server-only";
import { Redis } from "@upstash/redis";
import { timingSafeEqual } from "node:crypto";

export const TICKET_PREFIX = "WL26";

const K = {
  guests: "wl26:guests", // hash: id -> guest
  counter: "wl26:counter", // integer: last issued ticket number
  winners: "wl26:winners", // list of winner records, oldest first
  lock: "wl26:draw-lock",
  attempts: "wl26:login-attempts:", // + identifier → failed login counter
};

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

export const storageMode = redis ? "redis" : "memory";

// --- in-memory fallback (per server process; resets on restart) ------------
const mem = (globalThis.__wl26mem ??= { guests: new Map(), counter: 0, winners: [], attempts: new Map() });

const byTicket = (a, b) => a.ticketNo.localeCompare(b.ticketNo);
const ticketNumber = (n) => `${TICKET_PREFIX}-${String(n).padStart(4, "0")}`;
const parseTicket = (t) => parseInt(String(t).split("-").pop(), 10) || 0;

function randomString(length, alphabet) {
  // 248 is the largest multiple of 31 below 256 — reject above it to avoid bias.
  const out = [];
  while (out.length < length) {
    for (const b of crypto.getRandomValues(new Uint8Array(length * 2))) {
      if (b < 248 && out.length < length) out.push(alphabet[b % alphabet.length]);
    }
  }
  return out.join("");
}

const randomId = () => randomString(10, "abcdefghjkmnpqrstuvwxyz23456789");
// Guest login code: 6 characters, no look-alikes (0/O, 1/I/L).
export const newAccessCode = () => randomString(6, "ABCDEFGHJKMNPQRSTUVWXYZ23456789");

async function saveGuests(guests) {
  if (!guests.length) return;
  if (redis) await redis.hset(K.guests, Object.fromEntries(guests.map((g) => [g.id, g])));
  else guests.forEach((g) => mem.guests.set(g.id, g));
}

export async function listGuests() {
  const guests = redis ? Object.values((await redis.hgetall(K.guests)) || {}) : [...mem.guests.values()];
  // Guests registered before accounts existed get a code the first time the list loads.
  const missing = guests.filter((g) => !g.accessCode);
  missing.forEach((g) => (g.accessCode = newAccessCode()));
  await saveGuests(missing);
  return guests.sort(byTicket);
}

export async function getGuest(id) {
  if (!id) return null;
  return (redis ? await redis.hget(K.guests, id) : mem.guests.get(id)) || null;
}

export async function resetAccessCode(id) {
  const guest = await getGuest(id);
  if (!guest) return null;
  guest.accessCode = newAccessCode();
  await saveGuests([guest]);
  return guest;
}

// --- guest login -------------------------------------------------------------
const MAX_ATTEMPTS = 8;
const ATTEMPT_WINDOW_S = 15 * 60;

export async function tooManyAttempts(identifier) {
  const key = K.attempts + identifier;
  const n = redis ? Number(await redis.get(key)) || 0 : (mem.attempts.get(key)?.until > Date.now() ? mem.attempts.get(key).n : 0);
  return n >= MAX_ATTEMPTS;
}

export async function recordFailedAttempt(identifier) {
  const key = K.attempts + identifier;
  if (redis) {
    const n = await redis.incr(key);
    if (n === 1) await redis.expire(key, ATTEMPT_WINDOW_S);
  } else {
    const cur = mem.attempts.get(key);
    const live = cur && cur.until > Date.now();
    mem.attempts.set(key, { n: live ? cur.n + 1 : 1, until: live ? cur.until : Date.now() + ATTEMPT_WINDOW_S * 1000 });
  }
}

export async function clearAttempts(identifier) {
  const key = K.attempts + identifier;
  if (redis) await redis.del(key);
  else mem.attempts.delete(key);
}

// identifier = email address or ticket number (case-insensitive). Several guests
// may share an email (e.g. a plus-one), so the code decides which ticket it is.
export async function findGuestForLogin(identifier, code) {
  const id = identifier.trim().toLowerCase();
  const given = Buffer.from(code.trim().toUpperCase());
  const candidates = (await listGuests()).filter(
    (g) => g.ticketNo.toLowerCase() === id || (g.email && g.email.toLowerCase() === id)
  );
  return (
    candidates.find((g) => {
      const real = Buffer.from(g.accessCode);
      return real.length === given.length && timingSafeEqual(real, given);
    }) || null
  );
}

export async function winsFor(ticketNo) {
  return (await listWinners()).filter((w) => w.ticketNo === ticketNo);
}

export async function createGuest(details) {
  const n = redis ? await redis.incr(K.counter) : ++mem.counter;
  const guest = {
    id: randomId(),
    ticketNo: ticketNumber(n),
    accessCode: newAccessCode(),
    createdAt: new Date().toISOString(),
    ...details,
  };
  if (redis) await redis.hset(K.guests, { [guest.id]: guest });
  else mem.guests.set(guest.id, guest);
  return guest;
}

export async function deleteGuest(id) {
  if (redis) await redis.hdel(K.guests, id);
  else mem.guests.delete(id);
}

// Merge an exported list (keeps ids + ticket numbers) and bump the counter past them.
export async function importGuests(guests) {
  const valid = guests
    .filter((g) => g && g.id && g.ticketNo && g.name)
    .map((g) => (g.accessCode ? g : { ...g, accessCode: newAccessCode() }));
  const highest = valid.reduce((m, g) => Math.max(m, parseTicket(g.ticketNo)), 0);
  if (redis) {
    if (valid.length) await redis.hset(K.guests, Object.fromEntries(valid.map((g) => [g.id, g])));
    const current = Number(await redis.get(K.counter)) || 0;
    if (highest > current) await redis.set(K.counter, highest);
  } else {
    valid.forEach((g) => mem.guests.set(g.id, g));
    mem.counter = Math.max(mem.counter, highest);
  }
  return valid.length;
}

export async function listWinners() {
  if (!redis) return [...mem.winners];
  return (await redis.lrange(K.winners, 0, -1)) || [];
}

export async function clearWinners() {
  if (redis) await redis.del(K.winners);
  else mem.winners = [];
}

// Pick a winner on the server so every screen sees the same result.
export async function drawWinner({ prize, allowRepeat }) {
  if (redis) {
    // Short lock so two people pressing "Draw" at once can't both win the same prize slot.
    const got = await redis.set(K.lock, "1", { nx: true, ex: 10 });
    if (!got) throw Object.assign(new Error("Another draw is in progress"), { status: 409 });
  }
  try {
    const [guests, winners] = await Promise.all([listGuests(), listWinners()]);
    const won = new Set(winners.map((w) => w.ticketNo));
    const pool = allowRepeat ? guests : guests.filter((g) => !won.has(g.ticketNo));
    if (pool.length === 0) throw Object.assign(new Error("No tickets left in the hat"), { status: 400 });

    const chosen = pool[crypto.getRandomValues(new Uint32Array(1))[0] % pool.length];
    const record = {
      ticketNo: chosen.ticketNo,
      name: chosen.name,
      team: chosen.team || "",
      character: chosen.character || "",
      prize: prize || `Prize #${winners.length + 1}`,
      drawnAt: new Date().toISOString(),
    };
    if (redis) await redis.rpush(K.winners, record);
    else mem.winners.push(record);
    return { winner: record, pool: pool.map((g) => ({ ticketNo: g.ticketNo, name: g.name, character: g.character })) };
  } finally {
    if (redis) await redis.del(K.lock);
  }
}
