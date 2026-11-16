import "server-only";
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

// Two passwords:
// - ADMIN_PASSCODE: the admin area (games, lucky draw). Sent as x-admin-passcode.
// - REGISTRATION_PASSCODE: registration (the front desk). Sent as x-desk-passcode.
//   Defaults to "registration123"; set the variable in Vercel to change it.
// The two are fully separate: each password opens only its own area.
const ADMIN = process.env.ADMIN_PASSCODE || "";
const DESK = process.env.REGISTRATION_PASSCODE || "registration123";

export const authRequired = Boolean(ADMIN);
export const deskAuthRequired = Boolean(DESK);

function matches(given, real) {
  const a = Buffer.from(given || "");
  const b = Buffer.from(real);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function isAdmin(request) {
  return !ADMIN || matches(request.headers.get("x-admin-passcode"), ADMIN);
}

export function isDesk(request) {
  if (!DESK) return true;
  return matches(request.headers.get("x-desk-passcode"), DESK);
}

export function checkAuth(request) {
  return isAdmin(request) ? null : NextResponse.json({ error: "Admin password required" }, { status: 401 });
}

export function checkDesk(request) {
  return isDesk(request) ? null : NextResponse.json({ error: "Registration password required" }, { status: 401 });
}

export function errorResponse(err) {
  if (!err.status) console.error(err);
  return NextResponse.json({ error: err.status ? err.message : "Something went wrong — please try again" }, { status: err.status || 500 });
}
