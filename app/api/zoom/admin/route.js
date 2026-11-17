import { route, readJson } from "@/lib/route";
import { claimLive, releaseLive, setLive } from "@/lib/live";
import { deleteZoomItem, getZoomPublic, listZoomItems, saveZoomItem, zoomControl } from "@/lib/zoomGame";

export const dynamic = "force-dynamic";

// The 5 pictures with their answers (admin only).
export const GET = route(async () => ({ items: await listZoomItems() }), { admin: true });

// { action: "save", slot, answer, alternatives, images? } | { action: "delete", slot }
// | { action: "start" | "next" | "reset" }
export const POST = route(
  async (request) => {
    const body = await readJson(request);
    if (body.action === "save") await saveZoomItem(Number(body.slot), body);
    else if (body.action === "delete") await deleteZoomItem(Number(body.slot));
    else {
      if (body.action === "start") await claimLive("zoom"); // only one game at a time
      const state = await zoomControl(body.action);
      if (body.action === "start") await setLive("zoom"); // starting a game shows it on guests' phones
      // Reset, or stopped before any picture finished: clear guests' screens.
      // (Stopped with results: the final leaderboard stays on phones.)
      if (body.action === "reset" || state.status === "stopped") await releaseLive("zoom");
    }
    return { items: await listZoomItems(), game: await getZoomPublic() };
  },
  { admin: true }
);
