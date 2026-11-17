import { route, readJson } from "@/lib/route";
import { claimLive, releaseLive, setLive } from "@/lib/live";
import { getStagePublic, stageControl } from "@/lib/stageGame";

export const dynamic = "force-dynamic";
export const GET = route(() => getStagePublic({ admin: true }), { admin: true });

// { action: "draw" | "replace" | "question" | "winners" | "reset" | "stop", ticketNo?, text?, winners? }
export const POST = route(
  async (request) => {
    const body = await readJson(request);
    if (body.action === "draw") await claimLive("stage"); // only one game at a time
    await stageControl(body.action, body);
    if (body.action === "draw") await setLive("stage"); // calling people up shows Spotlight on phones
    if (body.action === "stop" || body.action === "reset") await releaseLive("stage");
    return getStagePublic({ admin: true });
  },
  { admin: true }
);
