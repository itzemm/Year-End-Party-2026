// Draft storage layer. Everything lives in the browser's localStorage, so the
// guest list is per-device. Use Export / Import on the Registration tab to move
// the list to the device running the Lucky Draw. Swap these functions for API
// calls (e.g. Vercel KV / Postgres) when you want a shared, central guest list.

const GUESTS_KEY = "wonderland2026.guests";
const WINNERS_KEY = "wonderland2026.winners";
const COUNTER_KEY = "wonderland2026.counter";

export const TICKET_PREFIX = "WL26";

function read(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — ignore in the draft */
  }
  window.dispatchEvent(new Event("wonderland-store"));
}

export function getGuests() {
  return read(GUESTS_KEY, []);
}

export function getWinners() {
  return read(WINNERS_KEY, []);
}

function nextTicketNumber() {
  const guests = getGuests();
  const highest = guests.reduce((max, g) => {
    const n = parseInt(String(g.ticketNo).split("-").pop(), 10);
    return Number.isFinite(n) && n > max ? n : max;
  }, read(COUNTER_KEY, 0));
  const next = highest + 1;
  write(COUNTER_KEY, next);
  return `${TICKET_PREFIX}-${String(next).padStart(4, "0")}`;
}

// Short random id (10 chars) — unique per guest, keeps the QR code readable.
function randomId() {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export function addGuest(details) {
  const guest = {
    id: randomId(),
    ticketNo: nextTicketNumber(),
    createdAt: new Date().toISOString(),
    ...details,
  };
  write(GUESTS_KEY, [...getGuests(), guest]);
  return guest;
}

export function removeGuest(id) {
  write(GUESTS_KEY, getGuests().filter((g) => g.id !== id));
}

export function addWinner(winner) {
  write(WINNERS_KEY, [...getWinners(), winner]);
}

export function clearWinners() {
  write(WINNERS_KEY, []);
}

export function exportData() {
  return JSON.stringify({ guests: getGuests(), winners: getWinners() }, null, 2);
}

export function importData(json) {
  const data = JSON.parse(json);
  if (!Array.isArray(data.guests)) throw new Error("File has no guest list");
  // Merge by ticket id so importing twice doesn't duplicate guests.
  const byId = new Map(getGuests().map((g) => [g.id, g]));
  data.guests.forEach((g) => byId.set(g.id, g));
  write(GUESTS_KEY, [...byId.values()].sort((a, b) => a.ticketNo.localeCompare(b.ticketNo)));
  if (Array.isArray(data.winners) && data.winners.length) write(WINNERS_KEY, data.winners);
  return data.guests.length;
}

// --- Ticket <-> QR payload ---------------------------------------------------
// The QR encodes a link to /ticket with the ticket details embedded, so scanning
// it shows the ticket on any phone, even without a backend.

function toBase64Url(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str) {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "===".slice((b64.length + 3) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

// Compact keys keep the QR code small enough to scan easily.
const KEYS = { i: "id", n: "ticketNo", g: "name", t: "team", b: "table", c: "character", m: "message" };

export function ticketPayload(guest) {
  const compact = {};
  for (const [short, long] of Object.entries(KEYS)) if (guest[long]) compact[short] = guest[long];
  return toBase64Url(JSON.stringify(compact));
}

export function decodeTicket(payload) {
  try {
    const compact = JSON.parse(fromBase64Url(payload));
    const guest = {};
    for (const [short, long] of Object.entries(KEYS)) if (compact[short]) guest[long] = compact[short];
    return guest.ticketNo && guest.name ? guest : null;
  } catch {
    return null;
  }
}

export function ticketUrl(guest) {
  return `${window.location.origin}/ticket?t=${ticketPayload(guest)}`;
}
