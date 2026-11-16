import { route, readJson } from "@/lib/route";
import { checkInGuest, undoCheckIn } from "@/lib/db";

// Front desk: { id?, ticketNo? } from a scanned QR code or typed in → check the guest in.
export const POST = route(async (request) => checkInGuest(await readJson(request)), { desk: true });

// Undo a check-in (checked the wrong person): { id }.
export const DELETE = route(async (request) => undoCheckIn(String((await readJson(request)).id || "")), { desk: true });
