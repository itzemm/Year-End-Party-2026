import { route, readJson } from "@/lib/route";
import { createPrize, listPrizes } from "@/lib/db";

export const dynamic = "force-dynamic";
export const GET = route(async () => ({ prizes: await listPrizes() }), { admin: true });
export const POST = route(async (request) => ({ prize: await createPrize(await readJson(request)) }), { admin: true });
