import { route, readJson, POLL_HEADERS } from "@/lib/route";
import { getLuckyPublic, selectPrize } from "@/lib/db";

export const dynamic = "force-dynamic";

// What the guests' Lucky Draw screens show: the prize, and the winner once the wheel stops.
export const GET = route(() => getLuckyPublic(), { headers: POLL_HEADERS });

// Admin: choose the prize being drawn for ({ prizeId }).
export const POST = route(
  async (request) => {
    await selectPrize((await readJson(request)).prizeId || null);
    return getLuckyPublic();
  },
  { admin: true }
);
