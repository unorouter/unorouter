"use client";

import { env } from "@/lib/config/env";
import { getPushSubscription } from "@/lib/notify/push";
import { rec, sha256Hex } from "@/lib/utils/base";
import {
  notifyEventChecker,
  notifyEventSchema,
  type NotifyEvent,
} from "@/lib/validation/notify";
import { Value } from "@sinclair/typebox/value";
import { chatStore } from "@/store/chat-store";
import { notifyConnectedAtom } from "@/store/notify-store";
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
    if (isLeader) return;
    if (event.data?.type === "event" && event.data.event) {
      deliver(event.data.event, false);
    }
  },
);

function parseNotifyEvent(raw: unknown): NotifyEvent | null {
  const withDefaults = Value.Default(notifyEventSchema, raw);
  return notifyEventChecker.Check(withDefaults) ? withDefaults : null;
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

// partysocket buffers sends while disconnected and flushes on (re)open.
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
  } catch {}
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
    } catch {}
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
    // No Web Locks: every tab connects; dedupe by event id copes.
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

export function setNotifyEventHandler(fn: EventHandler | null) {
  handler = fn;
}

// An empty list tears the connection down.
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

export function refreshNotifyPresence() {
  void sendSubscribe();
}
