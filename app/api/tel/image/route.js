import { NextResponse } from "next/server";
import { route } from "@/lib/route";
import { isAdmin } from "@/lib/auth";
import { imageResponse } from "@/lib/images";
import { getTelImage } from "@/lib/telGame";

export const dynamic = "force-dynamic";
export const GET = route(async (request) => {
  const p = new URL(request.url).searchParams;
  const dataUrl = await getTelImage(p.get("g"), Number(p.get("t")), Number(p.get("s")), { admin: isAdmin(request) });
  if (!dataUrl) return NextResponse.json({ error: "Not yet!" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  return imageResponse(dataUrl);
});
