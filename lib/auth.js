import "server-only";
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

// Admin passcode (ADMIN_PASSCODE). The admin page sends it as the x-admin-passcode
// header. Without it set, admin pages are open to anyone — the admin page warns.
export const authRequired = Boolean(process.env.ADMIN_PASSCODE);

export function isAdmin(request) {
  if (!authRequired) return true;
  const given = Buffer.from(request.headers.get("x-admin-passcode") || "");
  const real = Buffer.from(process.env.ADMIN_PASSCODE);
  return given.length === real.length && timingSafeEqual(given, real);
}

export function checkAuth(request) {
  return isAdmin(request) ? null : NextResponse.json({ error: "Admin passcode required" }, { status: 401 });
}

export function errorResponse(err) {
  if (!err.status) console.error(err);
  return NextResponse.json({ error: err.status ? err.message : "Something went wrong — please try again" }, { status: err.status || 500 });
}
