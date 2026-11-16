import { route, readJson } from "@/lib/route";
import { drawWinner } from "@/lib/db";

export const POST = route(async (request) => drawWinner({ allowRepeat: Boolean((await readJson(request)).allowRepeat) }), { admin: true });
