import { route, readJson } from "@/lib/route";
import { getGuest, markCheckedIn } from "@/lib/db";
import { httpError } from "@/lib/kv";
import { setGuestSession } from "@/lib/session";

// My Ticket: the guest tapped their name in the name finder ({ id }).
export const POST = route(async (request) => {
  const guest = await getGuest(String((await readJson(request)).id || "").slice(0, 40));
  if (!guest) throw httpError("We couldn’t find that name — ask at the registration booth", 404);
  await setGuestSession(guest);
  await markCheckedIn(guest); // opening My Ticket = checked in
  return { ok: true };
});
