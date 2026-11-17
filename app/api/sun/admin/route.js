import { route, readJson } from "@/lib/route";
import { claimLive, releaseLive, setLive } from "@/lib/live";
import { getSunPublic, sunControl } from "@/lib/sunGame";

// { action: "start" | "reveal" | "open" | "page", n?, page? }
export const POST = route(
  async (request) => {
    const body = await readJson(request);
    if (body.action === "start") await claimLive("sun"); // only one game at a time
    await sunControl(body.action, body);
    if (body.action === "start") await setLive("sun"); // starting a round shows it on guests' phones
    if (body.action === "stop") await releaseLive("sun");
    return getSunPublic();
  },
  { admin: true }
);
