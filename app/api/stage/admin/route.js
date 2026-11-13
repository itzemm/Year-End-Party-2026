import { route, readJson } from "@/lib/route";
import { setLive } from "@/lib/live";
import { getStagePublic, stageControl } from "@/lib/stageGame";

export const dynamic = "force-dynamic";
export const GET = route(() => getStagePublic({ admin: true }), { admin: true });

// { action: "draw" | "replace" | "question" | "winners" | "reset" | "stop", ticketNo?, text?, winners? }
export const POST = route(
  async (request) => {
    const body = await readJson(request);
    await stageControl(body.action, body);
    if (body.action === "draw") await setLive("stage"); // calling people up shows Spotlight on phones
    return getStagePublic({ admin: true });
  },
  { admin: true }
);
