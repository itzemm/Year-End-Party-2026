import { route, readJson, POLL_HEADERS } from "@/lib/route";
import { getLive, setLive } from "@/lib/live";

export const dynamic = "force-dynamic";

// Which game is on guests' phones.
export const GET = route(() => getLive(), { headers: POLL_HEADERS });

// Admin chooses what guests see: { game: "stage" | "zoom" | "sun" | null } (null = Nothing).
export const POST = route(
  async (request) => {
    await setLive((await readJson(request)).game ?? null);
    return getLive();
  },
  { admin: true }
);
