import { NextResponse } from "next/server";
import { getSunEntry, getSunRound } from "@/lib/db";
import { getSessionGuest } from "@/lib/session";
import { errorResponse } from "@/lib/auth";

export const dynamic = "force-dynamic";

// The logged-in guest's own entry for the current round.
export async function GET() {
  try {
    const guest = await getSessionGuest();
    if (!guest) return NextResponse.json({ loggedIn: false });
    const round = await getSunRound();
    const entry = round ? await getSunEntry(round.id, guest.id) : null;
    return NextResponse.json({ loggedIn: true, name: guest.name, roundId: round?.id ?? null, entry });
  } catch (err) {
    return errorResponse(err);
  }
}
