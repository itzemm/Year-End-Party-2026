import { NextResponse } from "next/server";
import { storageMode } from "@/lib/db";
import { authRequired, checkAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request) {
  return NextResponse.json({ storage: storageMode, authRequired, authorized: !checkAuth(request) });
}
