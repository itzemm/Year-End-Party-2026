import { NextResponse } from "next/server";
import { importGuests } from "@/lib/db";
import { checkAuth, errorResponse } from "@/lib/auth";

export async function POST(request) {
  const denied = checkAuth(request);
  if (denied) return denied;
  try {
    const body = await request.json();
    if (!Array.isArray(body.guests)) return NextResponse.json({ error: "File has no guest list" }, { status: 400 });
    return NextResponse.json({ imported: await importGuests(body.guests) });
  } catch (err) {
    return errorResponse(err);
  }
}
