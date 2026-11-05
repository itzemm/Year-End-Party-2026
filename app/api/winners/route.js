import { NextResponse } from "next/server";
import { clearWinners, listWinners } from "@/lib/db";
import { checkAuth, errorResponse } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const denied = checkAuth(request);
  if (denied) return denied;
  try {
    return NextResponse.json({ winners: await listWinners() });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(request) {
  const denied = checkAuth(request);
  if (denied) return denied;
  try {
    await clearWinners();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
