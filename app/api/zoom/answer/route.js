import { route, readJson, requireGuest } from "@/lib/route";
import { submitZoomAnswer } from "@/lib/zoomGame";

export const POST = route(async (request) => {
  const guest = await requireGuest();
  const { text } = await readJson(request);
  return submitZoomAnswer(guest, text);
});
