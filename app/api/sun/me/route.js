import { route } from "@/lib/route";
import { getSunMe } from "@/lib/sunGame";
import { getSessionGuest } from "@/lib/session";

export const dynamic = "force-dynamic";
export const GET = route(async () => {
  const guest = await getSessionGuest();
  return guest ? { loggedIn: true, name: guest.name, ...(await getSunMe(guest)) } : { loggedIn: false };
});
