import { route } from "@/lib/route";
import { getTelMe } from "@/lib/telGame";
import { getSessionGuest } from "@/lib/session";

export const dynamic = "force-dynamic";
export const GET = route(async () => {
  const guest = await getSessionGuest();
  return guest ? { loggedIn: true, ...(await getTelMe(guest)) } : { loggedIn: false };
});
