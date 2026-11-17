import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Server clock, so every phone counts down to the same moment.
export function GET() {
  return NextResponse.json({ now: Date.now() }, { headers: { "Cache-Control": "no-store" } });
}
