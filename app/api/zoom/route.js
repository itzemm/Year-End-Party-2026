import { route, POLL_HEADERS } from "@/lib/route";
import { getZoomPublic } from "@/lib/zoomGame";

export const dynamic = "force-dynamic";
export const GET = route(() => getZoomPublic(), { headers: POLL_HEADERS });
