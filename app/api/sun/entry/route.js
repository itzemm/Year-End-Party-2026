import { NextResponse } from "next/server";
import { submitSunEntry } from "@/lib/db";
import { getSessionGuest } from "@/lib/session";
import { errorResponse } from "@/lib/auth";

export async function POST(request) {
  try {
    const guest = await getSessionGuest();
    if (!guest) return NextResponse.json({ error: "Log in on the My Ticket tab to play." }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const n = Number(body.n);
    const { round, entry } = await submitSunEntry(guest, n);
    return NextResponse.json({ roundId: round.id, entry });
  } catch (err) {
    return errorResponse(err);
  }
}
