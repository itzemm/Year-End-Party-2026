import { route, readJson } from "@/lib/route";
import { importGuests } from "@/lib/db";
import { httpError } from "@/lib/kv";

// { guests: [{ name, ticketNo?, accessCode?, id?, createdAt? }] } — see importGuests.
export const POST = route(
  async (request) => {
    const { guests } = await readJson(request);
    if (!Array.isArray(guests) || !guests.length) throw httpError("No guests found in that file", 400);
    if (guests.length > 2000) throw httpError("That’s more than 2,000 rows — split the file", 400);
    return importGuests(guests);
  },
  { admin: true }
);
