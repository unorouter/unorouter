    // Per-conv context cache for upload-dedup: resolves a client hash to the last full payload. LRU + TTL; a miss 409s and the client retries full.

import type { ChatContext } from "@/lib/validation/chat";

const MAX_ENTRIES = 500;
const TTL_MS = 30 * 60 * 1000;

const cache = new Map<string, { hash: string; ctx: ChatContext; at: number }>();

export class ContextRequiredError extends Error {
  constructor() {
    super("context-required");
    this.name = "ContextRequiredError";
  }
}

export function storeContext(
  convId: string,
  hash: string,
  ctx: ChatContext,
): void {
  // Map iteration order = insertion order; delete+set keeps it LRU-ish.
  cache.delete(convId);
  cache.set(convId, { hash, ctx, at: Date.now() });
  if (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
}

    // Resolve the context payload: full payload wins and refreshes the cache, a matching hash serves the cached copy, unknown hash throws.
export function resolveContextPayload(body: {
  convId?: string | null;
  chatContext?: ChatContext;
  chatContextHash?: string;
}): ChatContext | undefined {
  if (body.chatContext) {
    if (body.convId && body.chatContextHash) {
      storeContext(body.convId, body.chatContextHash, body.chatContext);
    }
    return body.chatContext;
  }
  if (!body.chatContextHash || !body.convId) return undefined;
  const hit = cache.get(body.convId);
  if (
    hit &&
    hit.hash === body.chatContextHash &&
    Date.now() - hit.at < TTL_MS
  ) {
    hit.at = Date.now();
    return hit.ctx;
  }
  throw new ContextRequiredError();
}
