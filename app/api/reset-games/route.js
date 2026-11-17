import { route } from "@/lib/route";
import { stageControl } from "@/lib/stageGame";
import { zoomControl } from "@/lib/zoomGame";
import { sunControl } from "@/lib/sunGame";
import { setLive } from "@/lib/live";

// Reset every game back to the start (Guess the Image pictures and the lucky draw
// are kept) and show guests "No games currently".
export const POST = route(
  async () => {
    await Promise.all([stageControl("reset"), zoomControl("reset"), sunControl("reset")]);
    await setLive(null);
    return { ok: true };
  },
  { admin: true }
);
