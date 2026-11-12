import { route, POLL_HEADERS } from "@/lib/route";
import { getSunPublic } from "@/lib/sunGame";

export const dynamic = "force-dynamic";
export const GET = route(() => getSunPublic(), { headers: POLL_HEADERS });
