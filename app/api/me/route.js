import { NextResponse } from "next/server";
import { winsFor } from "@/lib/db";
import { getSessionGuest } from "@/lib/session";
import { errorResponse } from "@/lib/auth";

export const dynamic = "force-dynamic";

// The logged-in guest's own ticket (never the access code or other guests).
export async function GET() {
  try {
    const guest = await getSessionGuest();
    if (!guest) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    const { id, ticketNo, name, team, table, character, message, dietary } = guest;
    return NextResponse.json({
      guest: { id, ticketNo, name, team, table, character, message, dietary },
      wins: await winsFor(ticketNo),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
