// Tiny key-value layer: Upstash Redis when configured (Vercel Marketplace → Upstash
// Redis sets KV_REST_API_URL / KV_REST_API_TOKEN), otherwise an in-memory stand-in
// with the same commands so `npm run dev` works offline (data resets on restart).
import "server-only";
import { Redis } from "@upstash/redis";

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

export const storageMode = redis ? "redis" : "memory";

// ---- in-memory implementation ------------------------------------------------
const store = (globalThis.__wl26kv ??= { data: new Map(), expiry: new Map() });
const clone = (v) => (v === undefined || v === null ? null : structuredClone(v));
function live(key) {
  const exp = store.expiry.get(key);
  if (exp && exp <= Date.now()) {
    store.data.delete(key);
    store.expiry.delete(key);
  }
  return store.data.has(key);
}
function hash(key, create = false) {
  if (!live(key) && create) store.data.set(key, new Map());
  return store.data.get(key) || null;
}

const memory = {
  async get(key) {
    return live(key) ? clone(store.data.get(key)) : null;
  },
  async set(key, value, opts = {}) {
    if (opts.nx && live(key)) return null;
    store.data.set(key, clone(value));
    if (opts.ex) store.expiry.set(key, Date.now() + opts.ex * 1000);
    else store.expiry.delete(key);
    return "OK";
  },
  async del(...keys) {
    let n = 0;
    for (const k of keys) if (store.data.delete(k)) n++;
    return n;
  },
  async incr(key) {
    const v = (Number(live(key) ? store.data.get(key) : 0) || 0) + 1;
    store.data.set(key, v);
    return v;
  },
  async expire(key, seconds) {
    if (!live(key)) return 0;
    store.expiry.set(key, Date.now() + seconds * 1000);
    return 1;
  },
  async hget(key, field) {
    return clone(hash(key)?.get(field));
  },
  async hset(key, obj) {
    const h = hash(key, true);
    let n = 0;
    for (const [f, v] of Object.entries(obj)) {
      if (!h.has(f)) n++;
      h.set(f, clone(v));
    }
    return n;
  },
  async hgetall(key) {
    const h = hash(key);
    return h && h.size ? Object.fromEntries([...h].map(([f, v]) => [f, clone(v)])) : null;
  },
  async hdel(key, ...fields) {
    const h = hash(key);
    let n = 0;
    for (const f of fields) if (h?.delete(f)) n++;
    return n;
  },
  async hlen(key) {
    return hash(key)?.size || 0;
  },
};

// On Vercel, memory isn't shared between servers, so anything "saved" there would
// vanish. Refuse writes loudly instead, so a missing database is noticed at once.
const NO_DB = "No database connected, so nothing can be saved. In Vercel: Storage → connect Upstash Redis, then redeploy.";
const readOnlyMemory = Object.fromEntries(
  Object.entries(memory).map(([name, fn]) => [
    name,
    ["get", "hget", "hgetall", "hlen"].includes(name)
      ? fn
      : async () => {
          throw Object.assign(new Error(NO_DB), { status: 503 });
        },
  ])
);

export const kv = redis || (process.env.VERCEL ? readOnlyMemory : memory);

// Hash values as an array (empty when the hash doesn't exist).
export async function hvalues(key) {
  return Object.values((await kv.hgetall(key)) || {});
}

export const httpError = (message, status) => Object.assign(new Error(message), { status });
