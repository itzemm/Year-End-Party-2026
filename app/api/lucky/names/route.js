import { route } from "@/lib/route";
import { wheelNames } from "@/lib/db";

export const dynamic = "force-dynamic";

// The names on the lucky draw wheel (game admin password).
export const GET = route(async () => ({ names: await wheelNames() }), { admin: true });
