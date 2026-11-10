import { uid } from "@/lib/utils/base";
import {
  initMirror,
  mirrorChunk,
  mirrorDrop,
  mirrorEnd,
  mirrorStart,
} from "./stream-mirror";

// A phone that backgrounds the tab (iOS freezes it within seconds) drops the
// connection mid reply. The reply keeps streaming into this buffer so the tab
// can fetch the rest when it comes back; stream-mirror makes that work from any
// replica when Redis is configured.

const KEEP_AFTER_DONE_MS = 10 * 60_000;
const MAX_RUN_MS = 30 * 60_000;
// SSE spends 150 to 250 bytes per streamed token: a 100K token thinking reply
// is about 25 MiB.
const MAX_BYTES = 48 * 1024 * 1024;
const MAX_ENTRIES = 500;
// The custom provider relay is open to guests, so the whole buffer is capped
// well inside the pod's 3Gi limit.
const TOTAL_BUDGET = 256 * 1024 * 1024;

type Entry = {
  userId: number;
  chunks: Uint8Array[];
  bytes: number;
  done: boolean;
  wake: Set<() => void>;
  abort: () => void;
  doneAt: number | null;
};

const entries = new Map<string, Entry>();
let totalBytes = 0;

function drop(id: string) {
  const entry = entries.get(id);
  if (!entry) return;
  totalBytes -= entry.bytes;
  entries.delete(id);
  mirrorDrop(id);
}

export const STREAM_ID_HEADER = "x-uno-stream";
const MIRROR_TTL_S = (MAX_RUN_MS + KEEP_AFTER_DONE_MS) / 1000;

function sweep() {
  const now = Date.now();
  for (const [id, entry] of entries) {
    if (entry.doneAt !== null && now - entry.doneAt > KEEP_AFTER_DONE_MS)
      drop(id);
  }
  while (entries.size >= MAX_ENTRIES) {
    const oldest = entries.keys().next().value;
    if (oldest === undefined) break;
    entries.get(oldest)?.abort();
    drop(oldest);
  }
}

function freeFinished() {
  for (const [id, entry] of entries) {
    if (totalBytes <= TOTAL_BUDGET / 2) return;
    if (entry.done) drop(id);
  }
}

function finish(id: string, entry: Entry) {
  mirrorEnd(id, KEEP_AFTER_DONE_MS / 1000);
  entry.done = true;
  entry.doneAt = Date.now();
  entry.wake.forEach((fn) => fn());
  entry.wake.clear();
}

function append(id: string, entry: Entry, chunk: Uint8Array) {
  mirrorChunk(id, chunk, MIRROR_TTL_S);
  entry.chunks.push(chunk);
  entry.bytes += chunk.byteLength;
  totalBytes += chunk.byteLength;
  entry.wake.forEach((fn) => fn());
  entry.wake.clear();
}

const TOO_LONG_FRAME = new TextEncoder().encode(
  `\n\ndata: ${JSON.stringify({ error: { message: "The reply grew past the server's stream buffer and was stopped." } })}\n\ndata: [DONE]\n\n`,
);

// Reads the source to the end whether or not anyone is listening; `abort`
// stops it for real (the Stop button), a dropped connection does not.
export function bufferStream(
  source: ReadableStream<Uint8Array>,
  userId: number,
  abort: () => void,
): string {
  sweep();
  const id = uid(24);
  const entry: Entry = {
    userId,
    chunks: [],
    bytes: 0,
    done: false,
    wake: new Set(),
    abort,
    doneAt: null,
  };
  entries.set(id, entry);
  mirrorStart(id, userId, MIRROR_TTL_S);
  const deadline = setTimeout(abort, MAX_RUN_MS);
  void (async () => {
    const reader = source.getReader();
    try {
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        if (totalBytes + chunk.value.byteLength > TOTAL_BUDGET) freeFinished();
        if (
          entry.bytes + chunk.value.byteLength > MAX_BYTES ||
          totalBytes + chunk.value.byteLength > TOTAL_BUDGET
        ) {
          abort();
          append(id, entry, TOO_LONG_FRAME);
          break;
        }
        append(id, entry, chunk.value);
      }
    } catch {
      // The listener already holds every byte that arrived; nothing to add.
    } finally {
      clearTimeout(deadline);
      finish(id, entry);
    }
  })();
  return id;
}

// The bytes from `from` onward, waiting for more until the source ends.
export function tailStream(
  id: string,
  userId: number,
  from: number,
): ReadableStream<Uint8Array> | null {
  const entry = entries.get(id);
  if (!entry || entry.userId !== userId || from > entry.bytes) return null;
  let offset = from;
  let cancelled = false;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      for (;;) {
        if (cancelled) return;
        if (offset < entry.bytes) {
          let skip = offset;
          const out: Uint8Array[] = [];
          for (const chunk of entry.chunks) {
            if (skip >= chunk.byteLength) {
              skip -= chunk.byteLength;
              continue;
            }
            out.push(skip > 0 ? chunk.subarray(skip) : chunk);
            skip = 0;
          }
          for (const part of out) controller.enqueue(part);
          offset = entry.bytes;
          return;
        }
        if (entry.done) {
          controller.close();
          return;
        }
        await new Promise<void>((resolve) => entry.wake.add(resolve));
      }
    },
    cancel() {
      cancelled = true;
    },
  });
}

export function resumableResponse(
  source: ReadableStream<Uint8Array>,
  userId: number,
  abort: AbortController,
  status: number,
  headers: Headers,
): Response {
  const id = bufferStream(source, userId, () => abort.abort());
  headers.set(STREAM_ID_HEADER, id);
  return new Response(tailStream(id, userId, 0), { status, headers });
}

export function abortStream(id: string, userId: number): boolean {
  const entry = entries.get(id);
  if (!entry || entry.userId !== userId) return false;
  entry.abort();
  return true;
}

// connected at start, so the first reply after a restart is already mirrored
if (!process.env.NEXT_PHASE) initMirror(abortStream);
