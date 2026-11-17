import { route } from "@/lib/route";
import { getZoomMe } from "@/lib/zoomGame";
import { getSessionGuest } from "@/lib/session";

export const dynamic = "force-dynamic";
export const GET = route(async () => {
  const guest = await getSessionGuest();
  return guest ? { loggedIn: true, name: guest.name, ...(await getZoomMe(guest)) } : { loggedIn: false };
});
