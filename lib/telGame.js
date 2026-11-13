// Broken Telephone — 3 random teams of 5. Person 1 draws a secret sentence, the next
// three each copy the previous drawing, and the last person writes what they think it
// shows. The moderator runs one timer per turn for all teams at once, then reveals.
import "server-only";
import { kv, httpError } from "./kv";
import { checkDataUrl } from "./images";
import { listGuests, randomId, randomIndex } from "./db";
import {
  TEL_GRACE_MS,
  TEL_SENTENCES,
  TEL_TEAMS,
  TEL_TEAM_NAMES,
  TEL_TEAM_SIZE,
  TEL_FIRST_MS,
  TEL_NEXT_MS,
  sentenceMatch,
  telDuration,
  telPhase,
  telStepsDone,
  telTask,
} from "./rules";

const K = {
  state: "wl26:tel:state",
  subs: (gameId) => `wl26:tel:sub:${gameId}`, // hash "team:step" -> { type, text?, image? }
  img: (gameId, team, step) => `wl26:tel:img:${gameId}:${team}:${step}`,
  audience: (gameId) => `wl26:tel:aud:${gameId}`, // hash guestId -> { name, ticketNo, text, at }
};
const AUDIENCE_TOP = 5;
const DAY = 60 * 60 * 24;
const SETUP = { status: "setup", teams: [], sentence: "" };

const getState = async () => (await kv.get(K.state)) || SETUP;
const save = (state) => kv.set(K.state, state);
const person = (g) => ({ guestId: g.id, name: g.name, ticketNo: g.ticketNo });

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---- admin ---------------------------------------------------------------------------------
async function makeTeams() {
  const guests = await listGuests();
  const size = Math.min(TEL_TEAM_SIZE, Math.floor(guests.length / TEL_TEAMS));
  if (size < 2) throw httpError(`Register at least ${TEL_TEAMS * 2} guests first (${TEL_TEAMS * TEL_TEAM_SIZE} for full teams of ${TEL_TEAM_SIZE})`, 400);
  const picked = shuffle(guests).slice(0, size * TEL_TEAMS).map(person);
  return Array.from({ length: TEL_TEAMS }, (_, t) => picked.slice(t * size, (t + 1) * size));
}

export async function telControl(action, body = {}) {
  const state = await getState();
  const now = Date.now();
  const inGame = state.status === "playing";
  let next;

  if (action === "teams") {
    if (inGame) throw httpError("Stop the game before making new teams", 409);
    next = { ...state, status: "setup", teams: await makeTeams() };
  } else if (action === "replace") {
    // Swap one person (e.g. not here tonight) for a random guest who isn't on a team yet.
    const { team, slot } = body;
    if (!state.teams[team]?.[slot]) throw httpError("Unknown team member", 400);
    if (inGame && slot <= (state.endsAt ? state.step : state.step - 1)) throw httpError("That person has already played", 409);
    const used = new Set(state.teams.flat().map((p) => p.guestId));
    const free = (await listGuests()).filter((g) => !used.has(g.id));
    if (!free.length) throw httpError("Everyone registered is already on a team", 409);
    const teams = state.teams.map((t) => [...t]);
    teams[team][slot] = person(free[randomIndex(free.length)]);
    next = { ...state, teams };
  } else if (action === "sentence") {
    if (inGame) throw httpError("The sentence can’t change during a game", 409);
    const sentence = body.random ? TEL_SENTENCES[randomIndex(TEL_SENTENCES.length)] : String(body.sentence || "").trim().slice(0, 120);
    if (!sentence) throw httpError("Type a sentence", 400);
    next = { ...state, sentence };
  } else if (action === "start") {
    if (inGame) throw httpError("A game is already running", 409);
    if (!state.teams.length) throw httpError("Make the teams first", 400);
    if (!state.sentence) throw httpError("Set the secret sentence first", 400);
    next = { ...state, status: "playing", gameId: randomId(), step: 0, endsAt: null, teamSize: state.teams[0].length };
  } else if (action === "timer") {
    // Start the timer for the highlighted person in every team.
    if (!inGame) throw httpError("Start the game first", 409);
    const phase = telPhase(state, now);
    if (phase.kind === "running") throw httpError("The timer is already running", 409);
    if (phase.kind === "finished") throw httpError("Everyone has played — reveal the answers", 409);
    if (phase.collecting) throw httpError("Collecting the last drawings — try again in a moment", 409);
    const step = phase.active;
    next = { ...state, step, endsAt: now + telDuration(step) };
  } else if (action === "revealTeams") {
    const phase = telPhase(state, now);
    if (!(inGame && phase.kind === "finished" && now >= state.endsAt + TEL_GRACE_MS)) throw httpError("Finish every turn first", 409);
    next = { ...state, status: "revealTeams" };
  } else if (action === "revealAnswer") {
    if (state.status !== "revealTeams") throw httpError("Reveal the teams’ answers first", 409);
    next = { ...state, status: "revealAnswer" };
  } else if (action === "stop") {
    // Back to setup; teams and sentence are kept so the game can be restarted.
    next = { status: "setup", teams: state.teams, sentence: state.sentence };
  } else {
    throw httpError("Unknown action", 400);
  }
  await save(next);
  return next;
}

// ---- players ----------------------------------------------------------------------------------
function findPlayer(state, guestId) {
  for (let t = 0; t < state.teams.length; t++) {
    const slot = state.teams[t].findIndex((p) => p.guestId === guestId);
    if (slot >= 0) return { team: t, slot };
  }
  return null;
}

// The most recent drawing earlier in this team's chain (people who didn't draw are skipped).
async function previousDrawing(state, team, step) {
  for (let s = step - 1; s >= 0; s--) {
    const sub = await kv.hget(K.subs(state.gameId), `${team}:${s}`);
    if (sub?.image) return kv.get(K.img(state.gameId, team, s));
  }
  return null;
}

export async function getTelMe(guest) {
  const state = await getState();
  const me = findPlayer(state, guest.id);
  const out = { name: guest.name, onTeam: Boolean(me) };
  if (!me) {
    // Audience: follow the finished drawings and guess the sentence.
    if (state.status === "setup") return out;
    const subs = (await kv.hgetall(K.subs(state.gameId))) || {};
    const done = telStepsDone(state, Date.now());
    const lastDrawing = Math.min(done, state.teamSize - 1); // the final step is a written guess
    out.audience = {
      open: state.status === "playing",
      guess: (await kv.hget(K.audience(state.gameId), guest.id)) || null,
      drawings: state.teams.map((members, t) =>
        Array.from({ length: lastDrawing }, (_, s) => ({
          name: members[s]?.name,
          imageUrl: subs[`${t}:${s}`]?.image ? `/api/tel/image?g=${state.gameId}&t=${t}&s=${s}` : null,
        }))
      ),
    };
    return out;
  }
  Object.assign(out, me, { teamName: TEL_TEAM_NAMES[me.team] });
  if (state.status !== "playing") return out;
  out.gameId = state.gameId;
  const now = Date.now();
  const mine = await kv.hget(K.subs(state.gameId), `${me.team}:${me.slot}`);
  out.submitted = Boolean(mine);
  // Only the person whose turn it is gets to see their prompt.
  if (me.slot === state.step && state.endsAt && now < state.endsAt + TEL_GRACE_MS) {
    const task = telTask(me.slot, state.teamSize);
    const image = me.slot > 0 ? await previousDrawing(state, me.team, me.slot) : null;
    out.turn = { step: state.step, endsAt: state.endsAt, task: task === "copy" && !image ? "draw" : task, image };
    if (out.turn.task === "draw") out.turn.sentence = state.sentence; // person 1, or nobody drew before you
  }
  return out;
}

export async function submitTel(guest, { image, text }) {
  const state = await getState();
  const me = findPlayer(state, guest.id);
  if (!me) throw httpError("You’re not on a team this time", 403);
  if (state.status !== "playing" || me.slot !== state.step || !state.endsAt) throw httpError("It’s not your turn", 409);
  if (Date.now() > state.endsAt + TEL_GRACE_MS) throw httpError("Time’s up!", 409);
  const key = `${me.team}:${me.slot}`;
  if (telTask(me.slot, state.teamSize) === "guess") {
    const clean = String(text || "").trim().slice(0, 120);
    if (!clean) throw httpError("Type your guess", 400);
    await kv.hset(K.subs(state.gameId), { [key]: { type: "guess", text: clean } });
  } else {
    await kv.set(K.img(state.gameId, me.team, me.slot), checkDataUrl(image), { ex: DAY });
    await kv.hset(K.subs(state.gameId), { [key]: { type: "drawing", image: true } });
  }
  await kv.expire(K.subs(state.gameId), DAY);
  return { ok: true };
}

// ---- shared state ---------------------------------------------------------------------------------
export async function getTelPublic({ admin = false } = {}) {
  const state = await getState();
  const now = Date.now();
  const out = {
    status: state.status,
    teams: state.teams.map((members, t) => ({ name: TEL_TEAM_NAMES[t], members: members.map(({ name, ticketNo }) => ({ name, ticketNo })) })),
    durations: { first: TEL_FIRST_MS, next: TEL_NEXT_MS },
    now,
  };
  if (admin) out.sentence = state.sentence;
  if (state.status === "setup") return out;
  Object.assign(out, { gameId: state.gameId, step: state.step, endsAt: state.endsAt, teamSize: state.teamSize });
  const subs = (await kv.hgetall(K.subs(state.gameId))) || {};
  out.submitted = Object.fromEntries(Object.keys(subs).map((k) => [k, true]));
  if (state.status === "revealTeams" || state.status === "revealAnswer") {
    out.chains = state.teams.map((members, t) =>
      members.map((p, s) => {
        const sub = subs[`${t}:${s}`];
        return {
          name: p.name,
          type: telTask(s, state.teamSize) === "guess" ? "guess" : "drawing",
          text: sub?.text || null,
          imageUrl: sub?.image ? `/api/tel/image?g=${state.gameId}&t=${t}&s=${s}` : null,
        };
      })
    );
  }
  if (state.status === "revealAnswer") {
    out.sentence = state.sentence;
    out.chains.forEach((chain) => {
      const last = chain[chain.length - 1];
      last.match = last.text ? sentenceMatch(state.sentence, last.text) : 0;
    });
  }
  const audience = Object.values((await kv.hgetall(K.audience(state.gameId))) || {});
  out.audienceCount = audience.length;
  if (state.status === "revealAnswer") {
    out.audienceTop = audience
      .map((a) => ({ name: a.name, ticketNo: a.ticketNo, text: a.text, at: a.at, match: sentenceMatch(state.sentence, a.text) }))
      .sort((a, b) => b.match - a.match || a.at - b.at)
      .slice(0, AUDIENCE_TOP)
      .map(({ at, ...row }) => row);
  }
  return out;
}

export async function submitAudienceGuess(guest, text) {
  const state = await getState();
  if (findPlayer(state, guest.id)) throw httpError("You’re on a team — your team’s last player answers for you!", 403);
  if (state.status !== "playing") throw httpError("Audience guesses are closed", 409);
  const clean = String(text || "").trim().replace(/\s+/g, " ").slice(0, 160);
  if (!clean) throw httpError("Type your guess", 400);
  await kv.hset(K.audience(state.gameId), { [guest.id]: { name: guest.name, ticketNo: guest.ticketNo, text: clean, at: Date.now() } });
  await kv.expire(K.audience(state.gameId), DAY);
  return { guess: { text: clean } };
}

// Drawings are only shown to everyone once the moderator reveals them.
// Drawings are public once revealed. During the game, logged-in guests who aren't on
// a team (the audience) can see drawings from finished turns; team players can't.
export async function getTelImage(gameId, team, step, { admin = false, guest = null } = {}) {
  const state = await getState();
  if (state.gameId !== gameId) return null;
  const revealed = state.status === "revealTeams" || state.status === "revealAnswer";
  const audience = state.status === "playing" && guest && !findPlayer(state, guest.id) && step < telStepsDone(state, Date.now());
  if (!admin && !revealed && !audience) return null;
  return { dataUrl: await kv.get(K.img(gameId, team, step)), shared: revealed };
}
