import { route } from "@/lib/route";
import { clearWinners, listWinners } from "@/lib/db";

export const dynamic = "force-dynamic";
// Read by the front desk (Excel export) and the admin area.
export const GET = route(async () => ({ winners: await listWinners() }), { admin: true, desk: true });
export const DELETE = route(
  async () => {
    await clearWinners();
    return { ok: true };
  },
  { admin: true }
);
