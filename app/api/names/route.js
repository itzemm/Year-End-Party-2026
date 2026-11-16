import { route } from "@/lib/route";
import { findNames } from "@/lib/db";

export const dynamic = "force-dynamic";

// My Ticket name finder: ?q=hol → ["Holly Winters", …] (names only, max 8).
export const GET = route(async (request) => ({ names: await findNames(new URL(request.url).searchParams.get("q") || "") }), {
  headers: { "Cache-Control": "no-store", "CDN-Cache-Control": "public, max-age=10" },
});
