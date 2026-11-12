import { NextResponse } from "next/server";
import { countSunEntries, getSunRound } from "@/lib/db";
import { errorResponse } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Public round state, polled by every guest's phone. Nothing personal in it, so
// Vercel's CDN may serve it for 2s — 120 phones then cost ~1 database read per 2s.
export async function GET() {
  try {
    const round = await getSunRound();
    const entryCount = round ? await countSunEntries(round.id) : 0;
    return NextResponse.json(
      { round: round ? { ...round, entryCount } : null },
      { headers: { "Cache-Control": "no-store", "CDN-Cache-Control": "public, max-age=2" } }
    );
  } catch (err) {
    return errorResponse(err);
  }
}
