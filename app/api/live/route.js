import { route, readJson, POLL_HEADERS } from "@/lib/route";
import { getLive, setLive } from "@/lib/live";

export const dynamic = "force-dynamic";
export const GET = route(() => getLive(), { headers: POLL_HEADERS });
// Admin: { game: "zoom" | "sun" | "tel" | "stage" | null }
export const POST = route(async (request) => setLive((await readJson(request)).game ?? null), { admin: true });
