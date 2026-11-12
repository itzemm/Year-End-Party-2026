import { route, readJson } from "@/lib/route";
import { drawWinner } from "@/lib/db";

export const POST = route(
  async (request) => {
    const { prizeId, allowRepeat } = await readJson(request);
    return drawWinner({ prizeId, allowRepeat: Boolean(allowRepeat) });
  },
  { admin: true }
);
