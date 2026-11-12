import { NextResponse } from "next/server";
import { clearAttempts, findGuestForLogin, recordFailedAttempt, tooManyAttempts } from "@/lib/db";
import { setGuestSession } from "@/lib/session";
import { errorResponse } from "@/lib/auth";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const identifier = String(body.identifier ?? "").trim().toLowerCase().slice(0, 120);
    const code = String(body.code ?? "").trim().slice(0, 20);
    if (!identifier || !code) {
      return NextResponse.json({ error: "Enter your name (or ticket number) and access code" }, { status: 400 });
    }
    if (await tooManyAttempts(identifier)) {
      return NextResponse.json({ error: "Too many tries — the door is locked for 15 minutes." }, { status: 429 });
    }
    const guest = await findGuestForLogin(identifier, code);
    if (!guest) {
      await recordFailedAttempt(identifier);
      return NextResponse.json({ error: "That key doesn’t fit this door. Check your details and try again." }, { status: 401 });
    }
    await clearAttempts(identifier);
    await setGuestSession(guest);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
