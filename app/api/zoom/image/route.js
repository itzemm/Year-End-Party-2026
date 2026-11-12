import { NextResponse } from "next/server";
import { route } from "@/lib/route";
import { isAdmin } from "@/lib/auth";
import { imageResponse } from "@/lib/images";
import { getZoomImage } from "@/lib/zoomGame";

export const dynamic = "force-dynamic";
export const GET = route(async (request) => {
  const params = new URL(request.url).searchParams;
  const slot = Number(params.get("slot"));
  const level = Number(params.get("level"));
  const admin = params.has("preview") && isAdmin(request);
  const dataUrl = await getZoomImage(slot, level, { admin });
  if (!dataUrl) return NextResponse.json({ error: "Not yet!" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  return imageResponse(dataUrl, { cache: !admin });
});
