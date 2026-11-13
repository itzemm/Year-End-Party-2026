import { route, readJson } from "@/lib/route";
import { setLive } from "@/lib/live";
import { getTelPublic, telControl } from "@/lib/telGame";

export const dynamic = "force-dynamic";

// Full state including the secret sentence (admin only).
export const GET = route(() => getTelPublic({ admin: true }), { admin: true });

// { action: "teams" | "replace" | "sentence" | "start" | "timer" | "revealTeams" | "revealAnswer" | "stop", ... }
export const POST = route(
  async (request) => {
    const body = await readJson(request);
    await telControl(body.action, body);
    if (body.action === "start") await setLive("tel"); // starting the game shows it on guests' phones
    return getTelPublic({ admin: true });
  },
  { admin: true }
);
