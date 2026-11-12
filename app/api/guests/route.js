import { route, readJson } from "@/lib/route";
import { createGuest, listGuests } from "@/lib/db";
import { httpError } from "@/lib/kv";

export const dynamic = "force-dynamic";

export const GET = route(async () => ({ guests: await listGuests() }), { admin: true });

// Registration only needs the guest's name.
export const POST = route(
  async (request) => {
    const name = String((await readJson(request)).name ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
    if (!name) throw httpError("Guest name is required", 400);
    return { guest: await createGuest({ name }) };
  },
  { admin: true }
);
