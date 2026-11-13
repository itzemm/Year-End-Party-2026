// Which game segment guests' Games tab shows right now (set by the admin).
import "server-only";
import { kv, httpError } from "./kv";

export const GAME_IDS = ["zoom", "sun", "tel", "stage"];
const KEY = "wl26:live";

export async function getLive() {
  const live = await kv.get(KEY);
  return { game: GAME_IDS.includes(live?.game) ? live.game : null, now: Date.now() };
}

export async function setLive(game) {
  if (game !== null && !GAME_IDS.includes(game)) throw httpError("Unknown game", 400);
  await kv.set(KEY, { game, at: Date.now() });
  return getLive();
}
