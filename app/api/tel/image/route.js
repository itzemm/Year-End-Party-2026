import { NextResponse } from "next/server";
import { route } from "@/lib/route";
import { isAdmin } from "@/lib/auth";
import { imageResponse } from "@/lib/images";
import { getSessionGuest } from "@/lib/session";
import { getTelImage } from "@/lib/telGame";

export const dynamic = "force-dynamic";
export const GET = route(async (request) => {
  const p = new URL(request.url).searchParams;
  const admin = isAdmin(request);
  const guest = admin ? null : await getSessionGuest();
  const found = await getTelImage(p.get("g"), Number(p.get("t")), Number(p.get("s")), { admin, guest });
  if (!found?.dataUrl) return NextResponse.json({ error: "Not yet!" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  const res = imageResponse(found.dataUrl);
  // Before the reveal only the audience may see drawings, so the CDN must not share them.
  if (!found.shared) {
    res.headers.set("Cache-Control", "private, max-age=3600");
    res.headers.delete("CDN-Cache-Control");
  }
  return res;
});
