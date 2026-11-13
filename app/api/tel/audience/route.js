import { route, readJson, requireGuest } from "@/lib/route";
import { submitAudienceGuess } from "@/lib/telGame";

// Guests who aren't on a team guess the secret sentence ({ text }).
export const POST = route(async (request) => submitAudienceGuess(await requireGuest(), (await readJson(request)).text));
