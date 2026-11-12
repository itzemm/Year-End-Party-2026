import { route, readJson, requireGuest } from "@/lib/route";
import { submitSunEntry } from "@/lib/sunGame";

export const POST = route(async (request) => {
  const guest = await requireGuest();
  const { n } = await readJson(request);
  const { round, entry } = await submitSunEntry(guest, Number(n));
  return { roundId: round.id, entry };
});
