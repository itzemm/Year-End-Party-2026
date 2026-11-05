import { NextResponse } from "next/server";
import { clearGuestSession } from "@/lib/session";

export async function POST() {
  await clearGuestSession();
  return NextResponse.json({ ok: true });
}
