import { route } from "@/lib/route";
import { clearWinners, listWinners } from "@/lib/db";

export const dynamic = "force-dynamic";
export const GET = route(async () => ({ winners: await listWinners() }), { admin: true });
export const DELETE = route(
  async () => {
    await clearWinners();
    return { ok: true };
  },
  { admin: true }
);
