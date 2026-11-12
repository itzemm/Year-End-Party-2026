import { NextResponse } from "next/server";
import { closeSunRound, countSunEntries, openSunRound } from "@/lib/db";
import { checkAuth, errorResponse } from "@/lib/auth";

// Host controls: { action: "open", max } or { action: "close" }.
export async function POST(request) {
  const denied = checkAuth(request);
  if (denied) return denied;
  try {
    const body = await request.json().catch(() => ({}));
    let round;
    if (body.action === "open") round = await openSunRound(Number(body.max));
    else if (body.action === "close") round = await closeSunRound();
    else return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    return NextResponse.json({ round: { ...round, entryCount: await countSunEntries(round.id) } });
  } catch (err) {
    return errorResponse(err);
  }
}
