import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getGuest } from "./db";

// Guest sessions are a signed cookie holding the guest's id — no session table needed.
// The signature also covers the guest's access code, so resetting a code logs out
// every device that used the old one.
// SESSION_SECRET is recommended; otherwise we derive one from other secrets that are
// identical on every server instance (and as a last resort, a per-process random one).
const COOKIE = "wl26_guest";
const MAX_AGE = 60 * 60 * 24 * 60; // 60 days — covers the run-up to the party

const secret =
  process.env.SESSION_SECRET ||
  (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.ADMIN_PASSCODE
    ? createHash("sha256")
        .update(`wl26-session:${process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.ADMIN_PASSCODE}`)
        .digest("hex")
    : (globalThis.__wl26secret ??= randomBytes(32).toString("hex")));

const sign = (value) => createHmac("sha256", secret).update(value).digest("base64url");

export async function setGuestSession(guest) {
  (await cookies()).set(COOKIE, `${guest.id}.${sign(`${guest.id}:${guest.accessCode}`)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearGuestSession() {
  (await cookies()).delete(COOKIE);
}

// Returns the logged-in guest, or null if there's no valid session.
export async function getSessionGuest() {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot < 1) return null;
  const guest = await getGuest(raw.slice(0, dot));
  if (!guest?.accessCode) return null;
  const sig = Buffer.from(raw.slice(dot + 1));
  const expected = Buffer.from(sign(`${guest.id}:${guest.accessCode}`));
  return sig.length === expected.length && timingSafeEqual(sig, expected) ? guest : null;
}
