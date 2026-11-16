import { NextResponse } from "next/server";
import { deleteGuest } from "@/lib/db";
import { checkDesk, errorResponse } from "@/lib/auth";

export async function DELETE(request, { params }) {
  const denied = checkDesk(request);
  if (denied) return denied;
  try {
    const { id } = await params;
    await deleteGuest(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
