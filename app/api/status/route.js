import { NextResponse } from "next/server";
import { storageMode } from "@/lib/db";
import { authRequired, deskAuthRequired, isAdmin, isDesk } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request) {
  return NextResponse.json(
    { storage: storageMode, authRequired, authorized: isAdmin(request), deskAuthRequired, deskAuthorized: isDesk(request) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
