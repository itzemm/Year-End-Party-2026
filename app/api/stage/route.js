import { route, POLL_HEADERS } from "@/lib/route";
import { getStagePublic } from "@/lib/stageGame";

export const dynamic = "force-dynamic";
export const GET = route(() => getStagePublic(), { headers: POLL_HEADERS });
