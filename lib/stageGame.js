// Spotlight — 5 random guests are called up on stage, the host reveals a funny
// question ("who has the longest hair?") and picks the winner(s). Nobody is drawn twice.
import "server-only";
import { kv, httpError } from "./kv";
import { listGuests, randomIndex } from "./db";
import { STAGE_PICK, STAGE_QUESTIONS } from "./rules";

const KEY = "wl26:stage";
const EMPTY = { status: "idle", round: 0, contestants: [], question: null, winners: [], picked: [], usedQuestions: [], history: [] };
const person = (g) => ({ guestId: g.id, name: g.name, ticketNo: g.ticketNo });

const getState = async () => ({ ...EMPTY, ...((await kv.get(KEY)) || {}) });

async function pool(state) {
  const picked = new Set(state.picked);
  return (await listGuests()).filter((g) => !picked.has(g.id));
}

function pickRandom(list, n) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

function archive(state) {
  // Keep a record of the round that just finished (if it got as far as a question).
  if (!state.contestants.length || !state.question) return state.history;
  const winners = state.contestants.filter((c) => state.winners.includes(c.ticketNo)).map((c) => c.name);
  return [...state.history, { round: state.round, question: state.question, contestants: state.contestants.map((c) => c.name), winners }];
}

export async function stageControl(action, body = {}) {
  const state = await getState();
  let next;
  if (action === "draw") {
    // Call up the next 5 people: never anyone who has been picked before.
    const available = await pool(state);
    if (!available.length) throw httpError("Everyone has already been called up — reset the picks to start over", 409);
    const chosen = pickRandom(available, STAGE_PICK).map(person);
    next = {
      ...state,
      history: archive(state),
      status: "drawn",
      round: state.round + 1,
      contestants: chosen,
      question: null,
      winners: [],
      picked: [...state.picked, ...chosen.map((c) => c.guestId)],
    };
  } else if (action === "replace") {
    // Someone isn't here: swap them for another random person (they stay "picked").
    const i = state.contestants.findIndex((c) => c.ticketNo === body.ticketNo);
    if (i < 0) throw httpError("That person isn’t on stage", 400);
    if (state.status === "winners") throw httpError("Winners are already chosen", 409);
    const available = await pool(state);
    if (!available.length) throw httpError("Nobody left to call up", 409);
    const sub = person(available[randomIndex(available.length)]);
    const contestants = [...state.contestants];
    contestants[i] = sub;
    next = { ...state, contestants, picked: [...state.picked, sub.guestId] };
  } else if (action === "question") {
    if (state.status === "idle") throw httpError("Draw the names first", 409);
    if (state.status === "winners") throw httpError("This round is finished — draw new names", 409);
    let question = String(body.text || "").trim().slice(0, 160);
    if (!question) {
      let options = STAGE_QUESTIONS.filter((q) => !state.usedQuestions.includes(q) && q !== state.question);
      if (!options.length) options = STAGE_QUESTIONS.filter((q) => q !== state.question); // all used: start reusing
      question = options[randomIndex(options.length)];
    }
    next = { ...state, status: "question", question, usedQuestions: [...new Set([...state.usedQuestions, question])] };
  } else if (action === "winners") {
    if (state.status !== "question") throw httpError("Reveal a question first", 409);
    const onStage = new Set(state.contestants.map((c) => c.ticketNo));
    const winners = [...new Set(body.winners || [])].filter((t) => onStage.has(t));
    if (!winners.length) throw httpError("Tap at least one winner", 400);
    next = { ...state, status: "winners", winners };
  } else if (action === "reset") {
    // Start over: everyone can be called up again; history cleared.
    next = EMPTY;
  } else if (action === "stop") {
    next = { ...state, history: archive(state), status: "idle", contestants: [], question: null, winners: [] };
  } else {
    throw httpError("Unknown action", 400);
  }
  await kv.set(KEY, next);
  return next;
}

export async function getStagePublic({ admin = false } = {}) {
  const state = await getState();
  const strip = ({ name, ticketNo }) => ({ name, ticketNo });
  const out = {
    status: state.status,
    round: state.round,
    contestants: state.contestants.map(strip),
    question: state.question,
    winners: state.status === "winners" ? state.winners : [],
    history: state.history.slice(-10),
    now: Date.now(),
  };
  if (admin) {
    const total = (await listGuests()).length;
    out.pickedCount = state.picked.length;
    out.remaining = Math.max(0, total - state.picked.length);
  }
  return out;
}
