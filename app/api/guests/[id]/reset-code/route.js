import { NextResponse } from "next/server";
import { resetAccessCode } from "@/lib/db";
import { checkAuth, errorResponse } from "@/lib/auth";

export async function POST(request, { params }) {
  const denied = checkAuth(request);
  if (denied) return denied;
  try {
    const { id } = await params;
    const guest = await resetAccessCode(id);
    if (!guest) return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    return NextResponse.json({ guest });
  } catch (err) {
    return errorResponse(err);
  }
}
