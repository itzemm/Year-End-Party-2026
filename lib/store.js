"use client";

// Client-side data access. All guest / winner data lives in the shared database
// behind /api/*, so every device sees the same guest list.

const PASSCODE_KEY = "wonderland2026.passcode";

export function getPasscode() {
  try {
    return window.localStorage.getItem(PASSCODE_KEY) || "";
  } catch {
    return "";
  }
}

export function setPasscode(value) {
  try {
    window.localStorage.setItem(PASSCODE_KEY, value);
  } catch {
    /* private mode — passcode lasts for this page only */
  }
  window.__wl26Passcode = value;
  notifyChange();
}

function passcode() {
  return window.__wl26Passcode ?? getPasscode();
}

export function notifyChange() {
  window.dispatchEvent(new Event("wonderland-store"));
}

async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(path, {
    method,
    cache: "no-store",
    headers: {
      "x-admin-passcode": passcode(),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status})`), { status: res.status });
  return data;
}

export const fetchStatus = () => api("/api/status");
export const fetchGuests = () => api("/api/guests").then((d) => d.guests);
export const fetchWinners = () => api("/api/winners").then((d) => d.winners);

export async function addGuest(details) {
  const { guest } = await api("/api/guests", { method: "POST", body: details });
  notifyChange();
  return guest;
}

export async function removeGuest(id) {
  await api(`/api/guests/${encodeURIComponent(id)}`, { method: "DELETE" });
  notifyChange();
}

export async function drawWinner(prize, allowRepeat) {
  return api("/api/draw", { method: "POST", body: { prize, allowRepeat } });
}

export async function clearWinners() {
  await api("/api/winners", { method: "DELETE" });
  notifyChange();
}

export async function resetCode(id) {
  const { guest } = await api(`/api/guests/${encodeURIComponent(id)}/reset-code`, { method: "POST" });
  notifyChange();
  return guest;
}

// --- guest accounts ----------------------------------------------------------
export async function fetchMe() {
  const res = await fetch("/api/me", { cache: "no-store" });
  if (res.status === 401) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const login = (identifier, code) => api("/api/login", { method: "POST", body: { identifier, code } });
export const logout = () => api("/api/logout", { method: "POST" });

export function inviteMessage(guest) {
  const who = guest.email ? "your email" : `your ticket number (${guest.ticketNo})`;
  return [
    `Hi ${guest.name}!`,
    "",
    "You're invited to our Year End Party 2026 — Down the Rabbit Hole 🎩🐇",
    `Your ticket is waiting at ${window.location.origin}/my-ticket`,
    `Log in with ${who} and this access code: ${guest.accessCode}`,
    "",
    `Your lucky draw number is ${guest.ticketNo}. See you at the tea party!`,
  ].join("\n");
}

export async function exportData() {
  const [guests, winners] = await Promise.all([fetchGuests(), fetchWinners()]);
  return JSON.stringify({ guests, winners }, null, 2);
}

export async function importData(json) {
  const data = JSON.parse(json);
  const { imported } = await api("/api/guests/import", { method: "POST", body: { guests: data.guests } });
  notifyChange();
  return imported;
}

// --- Ticket <-> QR payload ---------------------------------------------------
// The QR encodes a link to /ticket with the ticket details embedded, so scanning
// it shows the ticket on any phone without needing the admin passcode.

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
