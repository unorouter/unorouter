"use client";

import { env } from "@/lib/config/env";
import { getPushSubscription } from "@/lib/notify/push";
import { isStringArray, rec, sha256Hex } from "@/lib/utils/base";
import { chatStore } from "@/store/chat-store";
import {
  notifyConnectedAtom,
  type NotifyEvent,
  type NotifyEventType,
} from "@/store/notify-store";
import { getNotifyEvents } from "@/openapi";
import { WebSocket as ReconnectingWebSocket } from "partysocket";

const CHANNEL_NAME = `${env.appName}-notify-events`;
const LEADER_LOCK = "unorouter-notify-ws-leader";
const CLIENT_PING_MS = 40_000;

type EventHandler = (evt: NotifyEvent) => void;

let handler: EventHandler | null = null;
let ws: ReconnectingWebSocket | null = null;
let wantedTopics: string[] = [];
let pingTimer: ReturnType<typeof setInterval> | null = null;
let isLeader = false;
let leaderRequested = false;
let started = false;
let everOpened = false;
let lastEventTs = 0;
const seenIds = new Set<string>();
const channel =
  typeof BroadcastChannel === "undefined"
    ? null
    : new BroadcastChannel(CHANNEL_NAME);

channel?.addEventListener(
  "message",
  (event: MessageEvent<{ type: string; event?: NotifyEvent }>) => {
    // Followers render events relayed by the leader tab.
    if (isLeader) return;
    if (event.data?.type === "event" && event.data.event) {
      deliver(event.data.event, false);
    }
  },
);

const NOTIFY_EVENT_TYPES: readonly NotifyEventType[] = [
  "model_online",
  "model_offline",
  "model_price_change",
  "model_added",
  "model_removed",
  "model_bulk_change",
];

function eventType(v: unknown): NotifyEventType | null {
  const found = NOTIFY_EVENT_TYPES.find((t) => t === v);
  return found ?? null;
}

function num(v: unknown): number | undefined {
  return typeof v === "number" ? v : undefined;
}

function bool(v: unknown): boolean | undefined {
  return typeof v === "boolean" ? v : undefined;
}

// The generated openapi NotifyEvent is WIDER than the store's (`type: string`,
// nullable topics) and omits the bulk_* digest fields entirely, so an upstream
// body is not a store event until it has been checked field by field.
function parseNotifyEvent(raw: unknown): NotifyEvent | null {
  const e = rec(raw);
  const d = e && rec(e.data);
  const type = eventType(e?.type);
  if (!e || !d || !type) return null;
  if (typeof e.id !== "string" || typeof e.ts !== "number") return null;
  if (typeof d.model !== "string") return null;
  const bulkEventType = eventType(d.bulk_event);
  return {
    id: e.id,
    type,
    ts: e.ts,
    topics: isStringArray(e.topics) ? e.topics : [],
    data: {
      model: d.model,
      free: d.free === true,
      online: bool(d.online),
      cheapest_ratio: num(d.cheapest_ratio),
      prev_cheapest_ratio: num(d.prev_cheapest_ratio),
      cheapest_group:
        typeof d.cheapest_group === "string" ? d.cheapest_group : undefined,
      bulk_event:
        bulkEventType && bulkEventType !== "model_bulk_change"
          ? bulkEventType
          : undefined,
      bulk_count: num(d.bulk_count),
      bulk_free: num(d.bulk_free),
      models: isStringArray(d.models) ? d.models : undefined,
    },
  };
}

function deliver(evt: NotifyEvent, relay: boolean) {
  if (seenIds.has(evt.id)) return;
  seenIds.add(evt.id);
  if (seenIds.size > 500) {
    const first = seenIds.values().next().value;
    if (first) seenIds.delete(first);
  }
  if (evt.ts > lastEventTs) lastEventTs = evt.ts;
  handler?.(evt);
  if (relay) {
    channel?.postMessage({ type: "event", event: evt });
  }
}

// partysocket buffers sends while disconnected and flushes on (re)open, so
// this can fire regardless of the current connection state.
async function sendSubscribe() {
  if (!ws) return;
  const sub = await getPushSubscription().catch(() => null);
  ws?.send(
    JSON.stringify({
      op: "subscribe",
      topics: wantedTopics,
      endpoint_hash: sub ? await sha256Hex(sub.endpoint) : "",
    }),
  );
}

async function catchUp() {
  if (lastEventTs === 0 || wantedTopics.length === 0) return;
  try {
    const res = await getNotifyEvents({
      since: String(lastEventTs),
      topics: wantedTopics.join(","),
    });
    if (!res.data.success) return;
    for (const raw of res.data.data ?? []) {
      const evt = parseNotifyEvent(raw);
      if (evt) deliver(evt, true);
    }
  } catch {
    // Missed catch-up is acceptable: the feed is session-ephemeral.
  }
}

function stopPing() {
  if (pingTimer) {
    clearInterval(pingTimer);
    pingTimer = null;
  }
}

function connect() {
  if (!isLeader || wantedTopics.length === 0 || ws) return;
  const wsUrl = env.apiOrigin.replace(/^http/, "ws") + "/ws";
  const socket = new ReconnectingWebSocket(wsUrl, [], {
    connectionTimeout: 10_000,
    maxEnqueuedMessages: 16,
  });
  ws = socket;

  socket.addEventListener("open", () => {
    chatStore.set(notifyConnectedAtom, true);
    void sendSubscribe();
    if (everOpened) void catchUp();
    everOpened = true;
    stopPing();
    pingTimer = setInterval(() => {
      socket.send(JSON.stringify({ op: "ping" }));
    }, CLIENT_PING_MS);
  });

  socket.addEventListener("message", (event: MessageEvent<string>) => {
    try {
      const frame = rec(JSON.parse(event.data));
      if (frame?.op !== "event") return;
      const evt = parseNotifyEvent(frame.event);
      if (evt) deliver(evt, true);
    } catch {
      // Ignore malformed frames.
    }
  });

  socket.addEventListener("close", () => {
    chatStore.set(notifyConnectedAtom, false);
    stopPing();
  });
}

function disconnect() {
  stopPing();
  const socket = ws;
  ws = null;
  socket?.close();
  chatStore.set(notifyConnectedAtom, false);
}

function requestLeadership() {
  if (leaderRequested) return;
  leaderRequested = true;
  if (typeof navigator === "undefined" || !("locks" in navigator)) {
    // No Web Locks (rare): every tab connects; dedupe by event id copes.
    isLeader = true;
    connect();
    return;
  }
  void navigator.locks.request(LEADER_LOCK, async () => {
    isLeader = true;
    connect();
    // Hold the lock until the tab dies so exactly one tab owns the socket.
    await new Promise(() => {});
  });
}

// setNotifyEventHandler registers the React-side renderer (toast + inbox).
export function setNotifyEventHandler(fn: EventHandler | null) {
  handler = fn;
}

// syncNotifyTopics is the single entry point: call with the current watch
// list whenever it changes. Empty list tears the connection down.
export function syncNotifyTopics(topics: string[]) {
  wantedTopics = [...topics];
  if (typeof window === "undefined") return;
  if (wantedTopics.length === 0) {
    disconnect();
    return;
  }
  if (!started) {
    started = true;
    requestLeadership();
  }
  if (isLeader) {
    if (!ws) connect();
    else void sendSubscribe();
  }
}

// refreshNotifyPresence re-sends the subscribe frame (e.g. after the push
// subscription appears) so the server learns the endpoint hash.
export function refreshNotifyPresence() {
  void sendSubscribe();
}
