"use client";

import { env } from "@/lib/config/env";

// Cross-tab pool-ownership protocol. Only one tab may hold a database's
// opfs-sahpool access handles; ownership moves ON DEMAND: a tab that needs
// the pool broadcasts `want`, the current owner drains, pauses its VFS and
// releases the Web Lock, and the requester's waiting lock acquire is granted.
// BroadcastChannel never delivers to the sender, so a tab's own `want` cannot
// park itself.
const CHANNEL_NAME = `${env.appName}-db-ownership`;

type OwnershipMessage = { type: "want"; dbPath: string };

const supported =
  typeof window !== "undefined" && typeof BroadcastChannel !== "undefined";

let channel: BroadcastChannel | null = null;

function ensureChannel(): BroadcastChannel | null {
  if (!supported) return null;
  if (channel) return channel;
  channel = new BroadcastChannel(CHANNEL_NAME);
  return channel;
}

export function requestOwnership(dbPath: string): void {
  ensureChannel()?.postMessage({
    type: "want",
    dbPath,
  } satisfies OwnershipMessage);
}

export function subscribeWant(dbPath: string, onWant: () => void): () => void {
  const ch = ensureChannel();
  if (!ch) return () => {};
  const handler = (event: MessageEvent<OwnershipMessage>) => {
    if (event.data?.type !== "want" || event.data.dbPath !== dbPath) return;
    onWant();
  };
  ch.addEventListener("message", handler);
  return () => ch.removeEventListener("message", handler);
}
