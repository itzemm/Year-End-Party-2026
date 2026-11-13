import { route, readJson } from "@/lib/route";
import { setLive } from "@/lib/live";
import { getSunPublic, sunControl } from "@/lib/sunGame";

// { action: "start" | "reveal" | "open" | "page", n?, page? }
export const POST = route(
  async (request) => {
    const body = await readJson(request);
    await sunControl(body.action, body);
    if (body.action === "start") await setLive("sun"); // starting a round shows it on guests' phones
    return getSunPublic();
  },
  { admin: true }
);
