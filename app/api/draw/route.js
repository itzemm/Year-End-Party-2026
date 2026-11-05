import { NextResponse } from "next/server";
import { drawWinner } from "@/lib/db";
import { checkAuth, errorResponse } from "@/lib/auth";

export async function POST(request) {
  const denied = checkAuth(request);
  if (denied) return denied;
  try {
    const body = await request.json().catch(() => ({}));
    const prize = String(body.prize ?? "").trim().slice(0, 100);
    return NextResponse.json(await drawWinner({ prize, allowRepeat: Boolean(body.allowRepeat) }));
  } catch (err) {
    return errorResponse(err);
  }
}
