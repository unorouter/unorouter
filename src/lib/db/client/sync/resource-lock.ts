"use client";

import { env } from "@/lib/config/env";
import { uid } from "@/lib/utils/base";

// Cross-tab single-holder lock; LOCK_TTL_MS expiry covers crashed holder.

const LOCK_TTL_MS = 5 * 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 30 * 1000;
const CHANNEL_NAME = `${env.appName.toLowerCase()}-resource-lock`;

type LockState = {
  resourceKey: string;
  ownerTabId: string;
  acquiredAt: number;
};

type LockMessage =
  | { type: "acquire"; lock: LockState }
  | { type: "release"; resourceKey: string; ownerTabId: string }
  | { type: "heartbeat"; lock: LockState }
  | { type: "request-state" };

type LockSubscriber = (event: {
  resourceKey: string;
  state: "acquired" | "released";
  byThisTab: boolean;
}) => void;

const supported =
  typeof window !== "undefined" && typeof BroadcastChannel !== "undefined";

const tabId = uid(16);
const heldLocks = new Map<string, LockState>();
const knownLocks = new Map<string, LockState>();
const subscribers = new Set<LockSubscriber>();

let channel: BroadcastChannel | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

function notify(
  resourceKey: string,
  state: "acquired" | "released",
  byThisTab: boolean,
): void {
  for (const cb of subscribers) {
    try {
      cb({ resourceKey, state, byThisTab });
    } catch {
    }
  }
}

function pruneStale(): void {
  const now = Date.now();
  for (const [key, lock] of knownLocks) {
    if (now - lock.acquiredAt > LOCK_TTL_MS) {
      knownLocks.delete(key);
      notify(key, "released", lock.ownerTabId === tabId);
    }
  }
}

function ensureChannel(): BroadcastChannel | null {
  if (!supported) return null;
  if (channel) return channel;
  channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (event: MessageEvent<LockMessage>) => {
    const msg = event.data;
    if (msg.type === "request-state") {
      for (const lock of heldLocks.values()) {
        channel?.postMessage({ type: "heartbeat", lock } satisfies LockMessage);
      }
      return;
    }
    if (msg.type === "acquire" || msg.type === "heartbeat") {
      knownLocks.set(msg.lock.resourceKey, msg.lock);
      if (msg.type === "acquire") {
        notify(msg.lock.resourceKey, "acquired", false);
      }
      return;
    }
    if (msg.type === "release") {
      const prior = knownLocks.get(msg.resourceKey);
      if (prior?.ownerTabId === msg.ownerTabId) {
        knownLocks.delete(msg.resourceKey);
        notify(msg.resourceKey, "released", false);
      }
    }
  };
  // Fresh tab asks siblings for current locks to avoid racing a peer.
  channel.postMessage({ type: "request-state" } satisfies LockMessage);
  return channel;
}

function startHeartbeat(): void {
  if (heartbeatTimer != null) return;
  heartbeatTimer = setInterval(() => {
    pruneStale();
    if (heldLocks.size === 0) return;
    for (const lock of heldLocks.values()) {
      channel?.postMessage({ type: "heartbeat", lock } satisfies LockMessage);
    }
  }, HEARTBEAT_INTERVAL_MS);
}

function stopHeartbeatIfIdle(): void {
  if (heartbeatTimer == null) return;
  if (heldLocks.size > 0) return;
  clearInterval(heartbeatTimer);
  heartbeatTimer = null;
}

export function acquireLock(resourceKey: string): boolean {
  if (!supported) return true;
  ensureChannel();
  pruneStale();
  if (heldLocks.has(resourceKey)) return true;
  if (knownLocks.has(resourceKey)) return false;
  const lock: LockState = {
    resourceKey,
    ownerTabId: tabId,
    acquiredAt: Date.now(),
  };
  heldLocks.set(resourceKey, lock);
  knownLocks.set(resourceKey, lock);
  channel?.postMessage({ type: "acquire", lock } satisfies LockMessage);
  startHeartbeat();
  notify(resourceKey, "acquired", true);
  return true;
}

export function releaseLock(resourceKey: string): void {
  if (!supported) return;
  const held = heldLocks.get(resourceKey);
  if (!held) return;
  heldLocks.delete(resourceKey);
  knownLocks.delete(resourceKey);
  channel?.postMessage({
    type: "release",
    resourceKey,
    ownerTabId: tabId,
  } satisfies LockMessage);
  notify(resourceKey, "released", true);
  stopHeartbeatIfIdle();
}

export function releaseAllLocks(): void {
  for (const key of [...heldLocks.keys()]) releaseLock(key);
}

export function isLocked(resourceKey: string): boolean {
  if (!supported) return false;
  pruneStale();
  return knownLocks.has(resourceKey);
}

export function isHeldByThisTab(resourceKey: string): boolean {
  return heldLocks.has(resourceKey);
}

export function subscribeLocks(cb: LockSubscriber): () => void {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", releaseAllLocks);
}
