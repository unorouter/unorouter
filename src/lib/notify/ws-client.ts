"use client";

import { env } from "@/lib/config/env";
import { getPushSubscription, sha256Hex } from "@/lib/notify/push";
import { chatStore } from "@/store/chat-store";
import { notifyConnectedAtom, type NotifyEvent } from "@/store/notify-store";
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
let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.addEventListener(
      "message",
      (event: MessageEvent<{ type: string; event?: NotifyEvent }>) => {
        // Followers render events relayed by the leader tab.
        if (isLeader) return;
        if (event.data?.type === "event" && event.data.event) {
          deliver(event.data.event, false);
        }
      },
    );
  }
  return channel;
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
    getChannel()?.postMessage({ type: "event", event: evt });
  }
}

// partysocket buffers sends while disconnected and flushes on (re)open, so
// this can fire regardless of the current connection state.
async function sendSubscribe() {
  if (!ws) return;
  let endpointHash = "";
  try {
    const sub = await getPushSubscription();
    if (sub) endpointHash = await sha256Hex(sub.endpoint);
  } catch {
    endpointHash = "";
  }
  ws?.send(
    JSON.stringify({
      op: "subscribe",
      topics: wantedTopics,
      endpoint_hash: endpointHash,
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
    for (const evt of res.data.data ?? []) deliver(evt as NotifyEvent, true);
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
      const frame = JSON.parse(event.data) as {
        op: string;
        event?: NotifyEvent;
      };
      if (frame.op === "event" && frame.event) deliver(frame.event, true);
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
    getChannel();
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
