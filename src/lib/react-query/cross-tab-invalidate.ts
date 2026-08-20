"use client";

import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { env } from "../config/env";

// null on the server and wherever BroadcastChannel is missing, which is what
// makes both exports no-ops there rather than each guarding separately.
const channel =
  typeof window !== "undefined" && typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel(`${env.appName}-query-invalidate`)
    : null;

type InvalidateMessage = { type: "invalidate"; keys: readonly QueryKey[] };

export function invalidateAndBroadcast(
  qc: QueryClient,
  keys: readonly QueryKey[],
) {
  for (const key of keys) qc.invalidateQueries({ queryKey: key });
  if (keys.length) {
    channel?.postMessage({
      type: "invalidate",
      keys,
    } satisfies InvalidateMessage);
  }
}

export function subscribeInvalidate(qc: QueryClient): () => void {
  if (!channel) return () => {};
  const handler = (event: MessageEvent<InvalidateMessage>) => {
    if (event.data?.type !== "invalidate") return;
    for (const key of event.data.keys) qc.invalidateQueries({ queryKey: key });
  };
  channel.addEventListener("message", handler);
  return () => channel.removeEventListener("message", handler);
}
