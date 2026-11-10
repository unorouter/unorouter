import { serverEnv } from "@/server/env";
import Redis from "ioredis";

// Copies each buffered reply to Redis so a tab that comes back on another
// replica can read the rest there. Optional: without Sentinels configured
// every function here is a no-op and replies resume only on their own process.
// The Redis is the gateway's (384mb, volatile-lru): a reply past MAX_STREAM_BYTES
// or this process past MAX_LIVE_BYTES stops mirroring and is resumable locally only.

const PREFIX = "uno:chat:";
const ABORT_CHANNEL = `${PREFIX}abort`;
const MAX_STREAM_BYTES = 2 * 1024 * 1024;
const MAX_LIVE_BYTES = 24 * 1024 * 1024;
const POLL_MS = 300;
// a reader with nothing new for this long gives up; the tab resumes again
const IDLE_GIVE_UP_MS = 60_000;

type Mirror = { bytes: number; cut: boolean };

let writer: Redis | null = null;
let subscriber: Redis | null = null;
let liveBytes = 0;
const mirrors = new Map<string, Mirror>();

function connect(offlineQueue: boolean): Redis | null {
  if (!serverEnv.redisSentinels) return null;
  const sentinels = serverEnv.redisSentinels.split(",").map((addr) => {
    const [host, port] = addr.trim().split(":");
    return { host, port: Number(port) || 26379 };
  });
  return new Redis({
    sentinels,
    name: serverEnv.redisMasterName,
    // a reply must never wait on Redis: a write that cannot go now cuts the mirror
    enableOfflineQueue: offlineQueue,
    maxRetriesPerRequest: 1,
    lazyConnect: false,
  }).on("error", () => {});
}

export function initMirror(onAbort: (id: string, userId: number) => void) {
  if (writer || !serverEnv.redisSentinels) return;
  writer = connect(false);
  subscriber = connect(true);
  void subscriber?.subscribe(ABORT_CHANNEL).catch(() => {});
  subscriber?.on("message", (_channel: string, raw: string) => {
    const [id, user] = raw.split(" ");
    if (id && user) onAbort(id, Number(user));
  });
}

const streamKey = (id: string) => `${PREFIX}s:${id}`;
const metaKey = (id: string) => `${PREFIX}m:${id}`;

// A failed or skipped write leaves a gap, so the reply stops being served from
// the mirror: no meta (never started) or t=1 both answer 404 elsewhere.
function cut(id: string) {
  const m = mirrors.get(id);
  if (!m || m.cut) return;
  m.cut = true;
  writer?.hset(metaKey(id), "t", "1").catch(() => {});
}

type ExecResult = [Error | null, unknown][] | null;
const failed = (r: ExecResult) => !r || r.some(([err]) => err);

export function mirrorStart(id: string, userId: number, ttlSeconds: number) {
  if (writer?.status !== "ready") return;
  mirrors.set(id, { bytes: 0, cut: false });
  writer
    .multi()
    .hset(metaKey(id), "u", String(userId))
    .expire(metaKey(id), ttlSeconds)
    .exec()
    .then(
      (r) => failed(r) && cut(id),
      () => cut(id),
    );
}

export function mirrorChunk(id: string, chunk: Uint8Array, ttlSeconds: number) {
  const m = mirrors.get(id);
  if (!writer || !m || m.cut) return;
  if (
    m.bytes + chunk.byteLength > MAX_STREAM_BYTES ||
    liveBytes + chunk.byteLength > MAX_LIVE_BYTES
  ) {
    cut(id);
    return;
  }
  const offset = m.bytes;
  m.bytes += chunk.byteLength;
  liveBytes += chunk.byteLength;
  writer
    .multi()
    .xadd(streamKey(id), "*", "c", Buffer.from(chunk), "o", String(offset))
    .expire(streamKey(id), ttlSeconds)
    .exec()
    .then(
      (r) => failed(r) && cut(id),
      () => cut(id),
    );
}

export function mirrorEnd(id: string, ttlSeconds: number) {
  const m = mirrors.get(id);
  if (!writer || !m) return;
  if (m.cut) return;
  writer
    .multi()
    .xadd(streamKey(id), "*", "end", "1")
    .expire(streamKey(id), ttlSeconds)
    .expire(metaKey(id), ttlSeconds)
    .exec()
    .then(
      (r) => failed(r) && cut(id),
      () => cut(id),
    );
}

export function mirrorDrop(id: string) {
  const m = mirrors.get(id);
  if (!m) return;
  liveBytes -= m.bytes;
  mirrors.delete(id);
}

export function publishAbort(id: string, userId: number) {
  writer?.publish(ABORT_CHANNEL, `${id} ${userId}`).catch(() => {});
}

const nextId = (id: string) => {
  const [ms, seq] = id.split("-");
  return `${ms}-${Number(seq) + 1}`;
};

// The mirrored bytes from `from` onward, polling until the end marker. null when
// this reply was never mirrored, belongs to someone else, or was cut.
export async function mirrorTail(
  id: string,
  userId: number,
  from: number,
): Promise<ReadableStream<Uint8Array> | null> {
  const redis = writer;
  if (!redis) return null;
  const meta = await redis.hgetall(metaKey(id)).catch(() => null);
  if (!meta || meta.u !== String(userId) || meta.t === "1") return null;
  let cursor = "0-0";
  let skip = from;
  // every chunk carries its byte offset; a gap means a lost write, never serve it
  let pos = 0;
  let idleSince = Date.now();
  let cancelled = false;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      for (;;) {
        if (cancelled) return;
        const rows = await redis
          .xrangeBuffer(streamKey(id), cursor, "+", "COUNT", 200)
          .catch(() => null);
        if (!rows) return controller.error(new Error("mirror unavailable"));
        let sent = false;
        for (const [rawId, fields] of rows) {
          cursor = nextId(rawId.toString());
          const name = fields[0]?.toString();
          if (name === "end") return controller.close();
          const chunk = fields[1];
          if (name !== "c" || !chunk) continue;
          if (Number(fields[3]?.toString()) !== pos)
            return controller.error(new Error("mirror gap"));
          pos += chunk.byteLength;
          if (skip >= chunk.byteLength) {
            skip -= chunk.byteLength;
            continue;
          }
          controller.enqueue(
            new Uint8Array(skip > 0 ? chunk.subarray(skip) : chunk),
          );
          skip = 0;
          sent = true;
        }
        if (sent) {
          idleSince = Date.now();
          return;
        }
        if ((await redis.hget(metaKey(id), "t").catch(() => null)) === "1")
          return controller.error(new Error("mirror cut"));
        if (Date.now() - idleSince > IDLE_GIVE_UP_MS)
          return controller.error(new Error("mirror idle"));
        await new Promise((r) => setTimeout(r, POLL_MS));
      }
    },
    cancel() {
      cancelled = true;
    },
  });
}
