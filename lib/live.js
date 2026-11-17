// Which game guests' Games tab shows. It follows the admin automatically: starting a
// game puts it on everyone's phone, stopping/resetting it clears the screen. Only one
// game can be in progress at a time.
import "server-only";
import { kv, httpError } from "./kv";
import { stageInProgress } from "./stageGame";
import { zoomInProgress } from "./zoomGame";
import { sunInProgress } from "./sunGame";
import { gameById } from "./games";

export const GAME_IDS = ["stage", "zoom", "sun"];
const KEY = "wl26:live";
const IN_PROGRESS = { stage: stageInProgress, zoom: zoomInProgress, sun: sunInProgress };

async function liveGame() {
  const live = await kv.get(KEY);
  return GAME_IDS.includes(live?.game) ? live.game : null;
}

export async function getLive() {
  const game = await liveGame();
  return { game, inProgress: game ? await IN_PROGRESS[game]() : false, now: Date.now() };
}

// Before starting a game: refuse if a different game is still in progress.
export async function claimLive(game) {
  const current = await liveGame();
  if (current && current !== game && (await IN_PROGRESS[current]())) {
    throw httpError(`${gameById(current).label} is still running — stop it before starting another game`, 409);
  }
}

export async function setLive(game) {
  await kv.set(KEY, { game, at: Date.now() });
}

// A game was stopped or reset: if it's the one on guests' phones, clear their screen.
export async function releaseLive(game) {
  if ((await liveGame()) === game) await kv.set(KEY, { game: null, at: Date.now() });
}
