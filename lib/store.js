"use client";

// Client-side data access. All guest / winner data lives in the shared database
// behind /api/*, so every device sees the same guest list.

const PASSCODE_KEY = "wonderland2026.passcode"; // admin area
const DESK_KEY = "wonderland2026.deskPasscode"; // front desk (registration + check-in)

function remember(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode — lasts for this page only */
  }
}
function recall(key) {
  try {
    return window.localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

export function setDeskPasscode(value) {
  remember(DESK_KEY, value);
  window.__wl26Desk = value;
  notifyChange();
}
export const clearDeskPasscode = () => setDeskPasscode("");
const deskPasscode = () => window.__wl26Desk ?? recall(DESK_KEY);

export function getPasscode() {
  try {
    return window.localStorage.getItem(PASSCODE_KEY) || "";
  } catch {
    return "";
  }
}

export function clearPasscode() {
  setPasscode("");
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
      "x-desk-passcode": deskPasscode(),
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

export async function clearWinners() {
  await api("/api/winners", { method: "DELETE" });
  notifyChange();
}


// --- polling helpers -------------------------------------------------------------
async function getJson(path) {
  const res = await fetch(path, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// --- Smallest Unique Number ------------------------------------------------------
export const fetchSun = () => getJson("/api/sun");
export const fetchSunMe = () => getJson("/api/sun/me");
export const submitSun = (n) => api("/api/sun/entry", { method: "POST", body: { n } });
export const sunAdmin = (action, extra = {}) => api("/api/sun/admin", { method: "POST", body: { action, ...extra } });

// --- Guess the Image --------------------------------------------------------------
export const fetchZoom = () => getJson("/api/zoom");
export const fetchZoomMe = () => getJson("/api/zoom/me");
export const submitZoomAnswer = (text) => api("/api/zoom/answer", { method: "POST", body: { text } });
export const fetchZoomItems = () => api("/api/zoom/admin");
export const zoomAdmin = (action, extra = {}) => api("/api/zoom/admin", { method: "POST", body: { action, ...extra } });

// --- What's live + Spotlight ------------------------------------------------------
export const fetchLive = () => getJson("/api/live");
export const setLiveGame = (game) => api("/api/live", { method: "POST", body: { game } });

export const fetchStage = () => getJson("/api/stage");
export const fetchStageAdmin = () => api("/api/stage/admin");
export const stageAdmin = (action, extra = {}) => api("/api/stage/admin", { method: "POST", body: { action, ...extra } });

// --- Lucky draw ------------------------------------------------------------------
export const fetchLucky = () => getJson("/api/lucky");
export const fetchWheelNames = () => api("/api/lucky/names").then((d) => d.names);
export const drawWinner = (allowRepeat) => api("/api/lucky/draw", { method: "POST", body: { allowRepeat } });

// Admin requests for pictures (the preview flag lets admins see pictures before a game).
export async function fetchAdminImage(url) {
  const res = await fetch(url, { headers: { "x-admin-passcode": passcode() }, cache: "no-store" });
  if (!res.ok) throw new Error("Couldn’t load picture");
  return URL.createObjectURL(await res.blob());
}

// --- guest accounts ----------------------------------------------------------
export async function fetchMe() {
  const res = await fetch("/api/me", { cache: "no-store" });
  if (res.status === 401) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const login = (id) => api("/api/login", { method: "POST", body: { id } });
export const logout = () => api("/api/logout", { method: "POST" });

export function inviteMessage(guest) {
  return [
    `Hi ${guest.name}!`,
    "",
    "You're invited to our Year End Party 2026 — Winter Wonderland ❄️⛄",
    `Your ticket is waiting at ${window.location.origin}/my-ticket`,
    "Just search for your name (first name, then last name) and tap it.",
    "",
    `Your lucky draw number is ${guest.ticketNo}. See you at the Winter Ball!`,
  ].join("\n");
}

// --- Excel export / import of the guest list -----------------------------------------
// Excel has no time zones: shift so the sheet shows the admin's local time (and back on import).
const toExcelTime = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000);
const fromExcelTime = (d) => new Date(d.getTime() + d.getTimezoneOffset() * 60000);

const EXCEL_COLUMNS = ["Ticket No", "Name", "Registered", "Checked in", "Lucky draw", "System ID (don’t edit)"];

export async function exportGuestsExcel() {
  const [guests, winners, { default: writeXlsxFile }] = await Promise.all([
    fetchGuests(),
    fetchWinners(),
    import("write-excel-file/browser"),
  ]);
  const won = new Set(winners.map((w) => w.ticketNo));
  const header = EXCEL_COLUMNS.map((value) => ({ value, fontWeight: "bold", backgroundColor: "#DCEFFD" }));
  const rows = guests.map((g) => [
    g.ticketNo,
    g.name,
    g.createdAt ? { value: toExcelTime(new Date(g.createdAt)), type: Date, format: "dd mmm yyyy hh:mm" } : null,
    g.checkedInAt ? { value: toExcelTime(new Date(g.checkedInAt)), type: Date, format: "hh:mm" } : "Not yet",
    won.has(g.ticketNo) ? "🏆 Won" : null,
    g.id,
  ]);
  const fileName = `winter-wonderland-guests-${new Date().toISOString().slice(0, 10)}.xlsx`;
  await writeXlsxFile([header, ...rows], {
    sheet: "Guests",
    columns: [{ width: 13 }, { width: 30 }, { width: 20 }, { width: 12 }, { width: 12 }, { width: 16 }],
    stickyRowsCount: 1,
  }).toFile(fileName);
  return guests.length;
}

// Turn spreadsheet rows into guests. Works with this app's export (matched by ticket /
// system ID) and with any list of names (first column, or a column called "Name").
function rowsToGuests(rows) {
  const text = (v) => (v === null || v === undefined ? "" : v instanceof Date ? v.toISOString() : String(v).trim());
  const isHeader = (c) => /^(guest )?(full )?name$|^first ?name$/i.test(text(c));
  const headerAt = rows.findIndex((r) => r.some(isHeader));
  if (headerAt < 0) return rows.map((r) => ({ name: text(r[0]) })).filter((g) => g.name);
  const head = rows[headerAt].map((c) => text(c).toLowerCase());
  const col = (re) => head.findIndex((h) => re.test(h));
  const c = { name: col(/^(guest )?(full )?name$/), first: col(/^first ?name$/), last: col(/^(last ?name|surname|family name)$/), ticket: col(/ticket/), code: col(/code/), id: col(/system id|^id$/), date: col(/registered/) };
  return rows
    .slice(headerAt + 1)
    .map((r) => ({
      // "First Last" — from a Name column, or First name + Last name columns.
      name: c.name >= 0 ? text(r[c.name]) : `${text(r[c.first])} ${c.last >= 0 ? text(r[c.last]) : ""}`.trim(),
      ticketNo: c.ticket >= 0 ? text(r[c.ticket]) : "",
      accessCode: c.code >= 0 ? text(r[c.code]) : "",
      id: c.id >= 0 ? text(r[c.id]) : "",
      createdAt: c.date >= 0 && r[c.date] instanceof Date ? fromExcelTime(r[c.date]).toISOString() : undefined,
    }))
    .filter((g) => g.name);
}

// Accepts .xlsx (this app's export or any list of names) and old .json backups.
export async function importGuestsFile(file) {
  let guests;
  if (/\.json$/i.test(file.name)) {
    guests = JSON.parse(await file.text()).guests;
  } else {
    const { readSheet } = await import("read-excel-file/browser");
    guests = rowsToGuests(await readSheet(file));
  }
  if (!guests?.length) throw new Error("No guest names found in that file");
  const result = await api("/api/guests/import", { method: "POST", body: { guests } });
  notifyChange();
  return result;
}
