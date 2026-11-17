import { route, POLL_HEADERS } from "@/lib/route";
import { getLive } from "@/lib/live";

export const dynamic = "force-dynamic";

// Which game is on guests' phones (set automatically when the admin starts a game).
export const GET = route(() => getLive(), { headers: POLL_HEADERS });
