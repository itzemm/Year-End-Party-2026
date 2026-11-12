import { route, readJson } from "@/lib/route";
import { getSunPublic, sunControl } from "@/lib/sunGame";

// { action: "start" | "reveal" | "open" | "page", n?, page? }
export const POST = route(
  async (request) => {
    const body = await readJson(request);
    await sunControl(body.action, body);
    return getSunPublic();
  },
  { admin: true }
);
