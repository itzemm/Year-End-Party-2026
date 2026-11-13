// Guests, logins, prizes and the lucky draw.
import "server-only";
import { timingSafeEqual } from "node:crypto";
import { kv, hvalues, httpError } from "./kv";
import { checkDataUrl, version } from "./images";
import { SPIN_MS } from "./rules";

export { storageMode } from "./kv";
export const TICKET_PREFIX = "WL26";

const K = {
  guests: "wl26:guests", // hash: id -> guest
  counter: "wl26:counter", // last issued ticket number
  attempts: "wl26:login-attempts:", // + identifier → failed login counter
  prizes: "wl26:prizes", // hash: id -> prize
  prizeImg: (id) => `wl26:prize-img:${id}`, // data URL
  prizeWinners: "wl26:prize-winners", // hash: prizeId -> winner record
  lucky: "wl26:lucky", // what the Lucky Draw screens are showing
  drawLock: "wl26:draw-lock",
};

const byTicket = (a, b) => a.ticketNo.localeCompare(b.ticketNo);
const ticketNumber = (n) => `${TICKET_PREFIX}-${String(n).padStart(4, "0")}`;
const parseTicket = (t) => parseInt(String(t).split("-").pop(), 10) || 0;

function randomString(length, alphabet) {
  // Reject bytes above the largest multiple of the alphabet size to avoid bias.
  const limit = 256 - (256 % alphabet.length);
  const out = [];
  while (out.length < length) {
    for (const b of crypto.getRandomValues(new Uint8Array(length * 2))) {
      if (b < limit && out.length < length) out.push(alphabet[b % alphabet.length]);
    }
  }
  return out.join("");
}

export const randomId = () => randomString(10, "abcdefghjkmnpqrstuvwxyz23456789");
// Guest login code: 6 characters, no look-alikes (0/O, 1/I/L).
export const newAccessCode = () => randomString(6, "ABCDEFGHJKMNPQRSTUVWXYZ23456789");
export const randomIndex = (n) => crypto.getRandomValues(new Uint32Array(1))[0] % n;

// ---- guests --------------------------------------------------------------------
async function saveGuests(guests) {
  if (guests.length) await kv.hset(K.guests, Object.fromEntries(guests.map((g) => [g.id, g])));
}

export async function listGuests() {
  const guests = await hvalues(K.guests);
  const missing = guests.filter((g) => !g.accessCode);
  missing.forEach((g) => (g.accessCode = newAccessCode()));
  await saveGuests(missing);
  return guests.sort(byTicket);
}

export async function getGuest(id) {
  return id ? (await kv.hget(K.guests, id)) || null : null;
}

export async function createGuest(details) {
  const n = await kv.incr(K.counter);
  const guest = { id: randomId(), ticketNo: ticketNumber(n), accessCode: newAccessCode(), createdAt: new Date().toISOString(), ...details };
  await kv.hset(K.guests, { [guest.id]: guest });
  return guest;
}

export async function deleteGuest(id) {
  await kv.hdel(K.guests, id);
}

export async function resetAccessCode(id) {
  const guest = await getGuest(id);
  if (!guest) return null;
  guest.accessCode = newAccessCode();
  await saveGuests([guest]);
  return guest;
}

// Import rows from an Excel export / old JSON backup / plain list of names.
// - Rows with a ticket number (or system ID) restore or update that guest, keeping
//   their ticket number and access code.
// - Rows with only a name are registered as new guests with new tickets.
const TICKET_RE = new RegExp(`^${TICKET_PREFIX}-\\d{1,6}$`);
const CODE_RE = /^[A-Z0-9]{6}$/;

export async function importGuests(rows) {
  const existing = await listGuests();
  const byId = new Map(existing.map((g) => [g.id, g]));
  const byTicket = new Map(existing.map((g) => [g.ticketNo, g]));
  const toSave = [];
  const newNames = [];
  let updated = 0;
  let restored = 0;
  let skipped = 0;
  for (const row of rows || []) {
    const name = String(row?.name ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
    if (!name) continue;
    const ticket = String(row.ticketNo ?? "").trim().toUpperCase();
    if (!ticket && !row.id) {
      newNames.push(name);
      continue;
    }
    if (ticket && !TICKET_RE.test(ticket)) {
      skipped++;
      continue;
    }
    const code = String(row.accessCode ?? "").trim().toUpperCase();
    const match = (row.id && byId.get(row.id)) || byTicket.get(ticket);
    if (match) {
      toSave.push({ ...match, name, accessCode: CODE_RE.test(code) ? code : match.accessCode });
      updated++;
    } else if (ticket) {
      const g = {
        id: String(row.id || randomId()).slice(0, 40),
        ticketNo: ticket,
        name,
        accessCode: CODE_RE.test(code) ? code : newAccessCode(),
        createdAt: row.createdAt || new Date().toISOString(),
      };
      toSave.push(g);
      byTicket.set(ticket, g);
      restored++;
    } else {
      skipped++;
    }
  }
  await saveGuests(toSave);
  const highest = toSave.reduce((m, g) => Math.max(m, parseTicket(g.ticketNo)), 0);
  const current = Number(await kv.get(K.counter)) || 0;
  if (highest > current) await kv.set(K.counter, highest);
  for (const name of newNames) await createGuest({ name }); // after the counter bump, so numbers never clash
  return { updated, restored, created: newNames.length, skipped };
}

// ---- guest login ---------------------------------------------------------------
const MAX_ATTEMPTS = 8;
const ATTEMPT_WINDOW_S = 15 * 60;

export async function tooManyAttempts(identifier) {
  return (Number(await kv.get(K.attempts + identifier)) || 0) >= MAX_ATTEMPTS;
}

export async function recordFailedAttempt(identifier) {
  const n = await kv.incr(K.attempts + identifier);
  if (n === 1) await kv.expire(K.attempts + identifier, ATTEMPT_WINDOW_S);
}

export async function clearAttempts(identifier) {
  await kv.del(K.attempts + identifier);
}

const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");

// identifier = the guest's name, ticket number or email (case-insensitive). Names can
// repeat, so the access code decides which guest it is.
export async function findGuestForLogin(identifier, code) {
  const id = norm(identifier);
  const given = Buffer.from(code.trim().toUpperCase());
  const candidates = (await listGuests()).filter(
    (g) => g.ticketNo.toLowerCase() === id || norm(g.name) === id || (g.email && norm(g.email) === id)
  );
  return (
    candidates.find((g) => {
      const real = Buffer.from(g.accessCode);
      return real.length === given.length && timingSafeEqual(real, given);
    }) || null
  );
}

// ---- prizes ----------------------------------------------------------------------
const prizeImageUrl = (p) => (p.imageVersion ? `/api/prizes/image?id=${p.id}&v=${p.imageVersion}` : null);
const publicPrize = (p) => (p ? { id: p.id, name: p.name, imageUrl: prizeImageUrl(p) } : null);

export async function listPrizes() {
  const [prizes, winners] = await Promise.all([hvalues(K.prizes), kv.hgetall(K.prizeWinners)]);
  return prizes
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((p) => ({ ...publicPrize(p), winner: winners?.[p.id] || null }));
}

export async function createPrize({ name, image }) {
  const clean = String(name || "").trim().slice(0, 80);
  if (!clean) throw httpError("Give the prize a name", 400);
  const prize = { id: randomId(), name: clean, createdAt: new Date().toISOString(), imageVersion: null };
  if (image) {
    await kv.set(K.prizeImg(prize.id), checkDataUrl(image));
    prize.imageVersion = version();
  }
  await kv.hset(K.prizes, { [prize.id]: prize });
  return publicPrize(prize);
}

export async function deletePrize(id) {
  await Promise.all([kv.hdel(K.prizes, id), kv.del(K.prizeImg(id)), kv.hdel(K.prizeWinners, id)]);
  const lucky = await kv.get(K.lucky);
  if (lucky?.prizeId === id) await kv.del(K.lucky);
}

export const getPrizeImage = (id) => kv.get(K.prizeImg(id));

// ---- lucky draw --------------------------------------------------------------------
export async function listWinners() {
  return (await hvalues(K.prizeWinners)).sort((a, b) => a.drawnAt.localeCompare(b.drawnAt));
}

export async function winsFor(ticketNo) {
  return (await listWinners()).filter((w) => w.ticketNo === ticketNo);
}

export async function clearWinners() {
  await kv.del(K.prizeWinners, K.lucky);
}

// Admin picks which prize the screens show as "now drawing for".
export async function selectPrize(prizeId) {
  const prize = prizeId ? await kv.hget(K.prizes, prizeId) : null;
  if (prizeId && !prize) throw httpError("Prize not found", 404);
  await kv.set(K.lucky, prize ? { prizeId } : {});
}

// What every guest's Lucky Draw tab shows. The winner stays hidden until the
// wheel on the big screen has stopped.
export async function getLuckyPublic() {
  const state = (await kv.get(K.lucky)) || {};
  const prize = state.prizeId ? await kv.hget(K.prizes, state.prizeId) : null;
  const now = Date.now();
  return {
    prize: publicPrize(prize),
    drawing: state.drawnAt ? { revealAt: state.revealAt } : null,
    winner: state.winner && now >= state.revealAt ? state.winner : null,
    now,
  };
}

// Pick a winner on the server so every screen sees the same result.
export async function drawWinner({ prizeId, allowRepeat }) {
  const got = await kv.set(K.drawLock, "1", { nx: true, ex: 10 });
  if (!got) throw httpError("Another draw is in progress", 409);
  try {
    const prize = await kv.hget(K.prizes, prizeId);
    if (!prize) throw httpError("Choose a prize to draw for", 400);
    const [guests, winners] = await Promise.all([listGuests(), listWinners()]);
    // Previous winners (including this prize's, on a redraw) sit out unless allowed.
    const won = new Set(winners.map((w) => w.ticketNo));
    const pool = allowRepeat ? guests : guests.filter((g) => !won.has(g.ticketNo));
    if (pool.length === 0) throw httpError("Nobody left to draw from", 400);

    const chosen = pool[randomIndex(pool.length)];
    const drawnAt = Date.now();
    const record = { prizeId, prize: prize.name, ticketNo: chosen.ticketNo, name: chosen.name, drawnAt: new Date(drawnAt).toISOString() };
    await kv.hset(K.prizeWinners, { [prizeId]: record });
    await kv.set(K.lucky, { prizeId, drawnAt, revealAt: drawnAt + SPIN_MS, winner: { name: chosen.name, ticketNo: chosen.ticketNo } });
    return { winner: record, pool: pool.map((g) => ({ ticketNo: g.ticketNo, name: g.name })), spinMs: SPIN_MS };
  } finally {
    await kv.del(K.drawLock);
  }
}
