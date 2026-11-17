import { route, POLL_HEADERS } from "@/lib/route";
import { getLuckyPublic } from "@/lib/db";

export const dynamic = "force-dynamic";

// What the guests' Lucky Draw screens show: the winner once the wheel stops.
export const GET = route(() => getLuckyPublic(), { headers: POLL_HEADERS });
