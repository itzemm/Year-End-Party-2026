import "server-only";
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

// Two passwords:
// - ADMIN_PASSCODE: the admin area (games, lucky draw). Sent as x-admin-passcode.
// - REGISTRATION_PASSCODE: the front desk (registration + check-in). Sent as
//   x-desk-passcode. The admin password also opens the front desk. If no
//   REGISTRATION_PASSCODE is set, the front desk uses the admin password.
const ADMIN = process.env.ADMIN_PASSCODE || "";
const DESK = process.env.REGISTRATION_PASSCODE || ADMIN;

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
  return matches(request.headers.get("x-desk-passcode"), DESK) || (ADMIN && matches(request.headers.get("x-admin-passcode"), ADMIN));
}

export function checkAuth(request) {
  return isAdmin(request) ? null : NextResponse.json({ error: "Admin password required" }, { status: 401 });
}

export function checkDesk(request) {
  return isDesk(request) ? null : NextResponse.json({ error: "Front desk password required" }, { status: 401 });
}

export function errorResponse(err) {
  if (!err.status) console.error(err);
  return NextResponse.json({ error: err.status ? err.message : "Something went wrong — please try again" }, { status: err.status || 500 });
}
