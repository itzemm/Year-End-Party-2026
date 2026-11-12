import { NextResponse } from "next/server";
import { route } from "@/lib/route";
import { imageResponse } from "@/lib/images";
import { getPrizeImage } from "@/lib/db";

export const dynamic = "force-dynamic";
export const GET = route(async (request) => {
  const dataUrl = await getPrizeImage(new URL(request.url).searchParams.get("id"));
  return dataUrl ? imageResponse(dataUrl) : NextResponse.json({ error: "Not found" }, { status: 404 });
});
