import { route, POLL_HEADERS } from "@/lib/route";
import { getTelPublic } from "@/lib/telGame";

export const dynamic = "force-dynamic";
export const GET = route(() => getTelPublic(), { headers: POLL_HEADERS });
