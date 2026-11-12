import { route } from "@/lib/route";
import { deletePrize } from "@/lib/db";

export const DELETE = route(
  async (request, { params }) => {
    await deletePrize((await params).id);
    return { ok: true };
  },
  { admin: true }
);
