// Guests, logins and the lucky draw.
import "server-only";
import { kv, hvalues, httpError } from "./kv";
import { SPIN_MS } from "./rules";

export { storageMode } from "./kv";
export const TICKET_PREFIX = "WL26";

const K = {
  guests: "wl26:guests", // hash: id -> guest
  counter: "wl26:counter", // last issued ticket number
  winners: "wl26:lucky-winners", // hash: drawId -> winner record
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

// ---- name finder + login (My Ticket) -------------------------------------------------
// Guests type part of "First Last" and tap their name to open their ticket — no code.
// Each typed word must match the start of a word in the name. When two guests share a
// name, their ticket numbers are shown so they can tell which is theirs.
const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");

export async function findNames(query) {
  const words = norm(query).split(" ").filter(Boolean);
  if (!words.length || norm(query).replace(/ /g, "").length < 2) return [];
  const guests = await listGuests();
  const count = new Map();
  guests.forEach((g) => count.set(norm(g.name), (count.get(norm(g.name)) || 0) + 1));
  return guests
    .filter((g) => {
      const parts = norm(g.name).split(" ");
      return words.every((w) => parts.some((p) => p.startsWith(w)));
    })
    .sort((a, b) => a.name.localeCompare(b.name) || a.ticketNo.localeCompare(b.ticketNo))
    .slice(0, 8)
    .map((g) => ({ id: g.id, name: g.name, ...(count.get(norm(g.name)) > 1 ? { ticketNo: g.ticketNo } : {}) }));
}

// ---- lucky draw --------------------------------------------------------------------
// A wheel of every registered guest. Each spin picks one winner; previous winners
// sit out unless the admin allows repeats.
export async function listWinners() {
  return (await hvalues(K.winners)).sort((a, b) => a.drawnAt.localeCompare(b.drawnAt));
}

export async function winsFor(ticketNo) {
  return (await listWinners()).filter((w) => w.ticketNo === ticketNo);
}

export async function clearWinners() {
  await kv.del(K.winners, K.lucky);
}

// Names for the admin's wheel (no access codes — the guest list itself is registration-only).
export async function wheelNames() {
  return (await listGuests()).map(({ name, ticketNo }) => ({ name, ticketNo }));
}

// What every guest's Lucky Draw tab shows. The winner stays hidden until the
// wheel on the big screen has stopped.
export async function getLuckyPublic() {
  const state = (await kv.get(K.lucky)) || {};
  const now = Date.now();
  return {
    drawing: state.drawnAt ? { revealAt: state.revealAt } : null,
    winner: state.winner && now >= state.revealAt ? state.winner : null,
    now,
  };
}

// Pick a winner on the server so every screen sees the same result.
export async function drawWinner({ allowRepeat }) {
  const got = await kv.set(K.drawLock, "1", { nx: true, ex: 10 });
  if (!got) throw httpError("Another draw is in progress", 409);
  try {
    const [guests, winners] = await Promise.all([listGuests(), listWinners()]);
    if (guests.length === 0) throw httpError("Nobody is registered yet", 400);
    const won = new Set(winners.map((w) => w.ticketNo));
    const pool = allowRepeat ? guests : guests.filter((g) => !won.has(g.ticketNo));
    if (pool.length === 0) throw httpError("Everyone has already won — tick “Let previous winners win again” to keep going", 400);
    const chosen = pool[randomIndex(pool.length)];
    const drawnAt = Date.now();
    const record = { id: randomId(), ticketNo: chosen.ticketNo, name: chosen.name, drawnAt: new Date(drawnAt).toISOString() };
    await kv.hset(K.winners, { [record.id]: record });
    await kv.set(K.lucky, { drawnAt, revealAt: drawnAt + SPIN_MS, winner: { name: chosen.name, ticketNo: chosen.ticketNo } });
    return { winner: record, pool: pool.map((g) => ({ ticketNo: g.ticketNo, name: g.name })), spinMs: SPIN_MS };
  } finally {
    await kv.del(K.drawLock);
  }
}
