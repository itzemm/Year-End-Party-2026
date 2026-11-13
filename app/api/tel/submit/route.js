import { route, readJson, requireGuest } from "@/lib/route";
import { submitTel } from "@/lib/telGame";

export const POST = route(async (request) => submitTel(await requireGuest(), await readJson(request)));
