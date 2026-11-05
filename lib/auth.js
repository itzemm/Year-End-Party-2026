import "server-only";
import { NextResponse } from "next/server";

// Optional admin passcode. When ADMIN_PASSCODE is set, the guest list, imports
// and the lucky draw require it (sent as the x-admin-passcode header).
// Guests scanning their QR code never need it — the ticket page doesn't call the API.
export const authRequired = Boolean(process.env.ADMIN_PASSCODE);

export function checkAuth(request) {
  if (!authRequired) return null;
  if (request.headers.get("x-admin-passcode") === process.env.ADMIN_PASSCODE) return null;
  return NextResponse.json({ error: "Passcode required" }, { status: 401 });
}

export function errorResponse(err) {
  return NextResponse.json({ error: err.message || "Something went wrong" }, { status: err.status || 500 });
}
