// Server-only data layer. Uses Upstash Redis when its env vars are present
// (Vercel Marketplace → Upstash Redis sets KV_REST_API_URL / KV_REST_API_TOKEN),
// otherwise falls back to an in-memory store so `npm run dev` works offline.
import "server-only";
import { Redis } from "@upstash/redis";

export const TICKET_PREFIX = "WL26";

const K = {
  guests: "wl26:guests", // hash: id -> guest
  counter: "wl26:counter", // integer: last issued ticket number
  winners: "wl26:winners", // list of winner records, oldest first
  lock: "wl26:draw-lock",
};

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

export const storageMode = redis ? "redis" : "memory";

// --- in-memory fallback (per server process; resets on restart) ------------
const mem = (globalThis.__wl26mem ??= { guests: new Map(), counter: 0, winners: [] });

const byTicket = (a, b) => a.ticketNo.localeCompare(b.ticketNo);
const ticketNumber = (n) => `${TICKET_PREFIX}-${String(n).padStart(4, "0")}`;
const parseTicket = (t) => parseInt(String(t).split("-").pop(), 10) || 0;

function randomId() {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export async function listGuests() {
  if (!redis) return [...mem.guests.values()].sort(byTicket);
  const all = (await redis.hgetall(K.guests)) || {};
  return Object.values(all).sort(byTicket);
}

export async function createGuest(details) {
  const n = redis ? await redis.incr(K.counter) : ++mem.counter;
  const guest = { id: randomId(), ticketNo: ticketNumber(n), createdAt: new Date().toISOString(), ...details };
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
  const valid = guests.filter((g) => g && g.id && g.ticketNo && g.name);
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
