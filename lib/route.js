import "server-only";
import { NextResponse } from "next/server";
import { checkAuth, checkDesk, errorResponse } from "./auth";
import { getSessionGuest } from "./session";
import { httpError } from "./kv";

// Polled by every phone: browsers must not cache it, but Vercel's CDN may serve the
// same answer for 1 second, so 120 phones cost about one database read per second.
export const POLL_HEADERS = { "Cache-Control": "no-store", "CDN-Cache-Control": "public, max-age=1" };
export const NO_STORE = { "Cache-Control": "no-store" };

// Wraps a route handler: optional password check, JSON response, consistent errors.
// admin: game admin password. desk: registration password. Both: either one works.
export function route(fn, { admin = false, desk = false, headers = NO_STORE } = {}) {
  return async (request, context) => {
    let denied = null;
    if (admin && desk) denied = checkAuth(request) && checkDesk(request);
    else if (admin) denied = checkAuth(request);
    else if (desk) denied = checkDesk(request);
    if (denied) return denied;
    try {
      const result = await fn(request, context);
      return result instanceof Response ? result : NextResponse.json(result, { headers });
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export const readJson = (request) => request.json().catch(() => ({}));

export async function requireGuest() {
  const guest = await getSessionGuest();
  if (!guest) throw httpError("Log in on the My Ticket tab to play.", 401);
  return guest;
}
