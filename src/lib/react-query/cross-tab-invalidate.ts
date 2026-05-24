"use client";

import type { QueryClient, QueryKey } from "@tanstack/react-query";

// Cross-tab RQ invalidate via BroadcastChannel; no-op when unavailable. Broadcast AFTER local write.

const CHANNEL_NAME = "unorouter-query-invalidate";
type InvalidateMessage = { type: "invalidate"; keys: QueryKey[] };

const supported =
  typeof window !== "undefined" && typeof BroadcastChannel !== "undefined";

let channel: BroadcastChannel | null = null;

function ensureChannel(): BroadcastChannel | null {
  if (!supported) return null;
  if (channel) return channel;
  channel = new BroadcastChannel(CHANNEL_NAME);
  return channel;
}

export function broadcastInvalidate(keys: QueryKey[]): void {
  if (keys.length === 0) return;
  const ch = ensureChannel();
  if (!ch) return;
  ch.postMessage({ type: "invalidate", keys } satisfies InvalidateMessage);
}

export function subscribeInvalidate(qc: QueryClient): () => void {
  const ch = ensureChannel();
  if (!ch) return () => {};
  const handler = (event: MessageEvent<InvalidateMessage>) => {
    if (event.data?.type !== "invalidate") return;
    for (const key of event.data.keys) {
      qc.invalidateQueries({ queryKey: key });
    }
  };
  ch.addEventListener("message", handler);
  return () => ch.removeEventListener("message", handler);
}
