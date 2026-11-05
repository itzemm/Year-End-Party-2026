import { NextResponse } from "next/server";
import { createGuest, listGuests } from "@/lib/db";
import { checkAuth, errorResponse } from "@/lib/auth";

export const dynamic = "force-dynamic";

const FIELDS = { name: 80, email: 120, team: 80, table: 40, character: 40, dietary: 120, message: 80 };

export async function GET(request) {
  const denied = checkAuth(request);
  if (denied) return denied;
  try {
    return NextResponse.json({ guests: await listGuests() });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request) {
  const denied = checkAuth(request);
  if (denied) return denied;
  try {
    const body = await request.json();
    const details = {};
    for (const [key, max] of Object.entries(FIELDS)) {
      details[key] = String(body[key] ?? "").trim().slice(0, max);
    }
    if (!details.name) return NextResponse.json({ error: "Guest name is required" }, { status: 400 });
    return NextResponse.json({ guest: await createGuest(details) }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
