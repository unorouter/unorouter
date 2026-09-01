"use client";

import { env } from "@/lib/config/env";
import { rec } from "@/lib/utils/base";
import { WebSocket as ReconnectingWebSocket } from "partysocket";

// A room is per-TAB, unlike the notify socket which elects one leader per
// browser and fans out over BroadcastChannel. The host's room is bound to the
// tab holding the chat runtime, so electing a different tab would put the
// socket where there is no runtime to append a turn into.

const PING_MS = 40_000;
export const ROOM_TOPIC_PREFIX = "room:";

export type RoomSocketEvents = {
  onOpen: (connId: string) => void;
  onFrame: (data: unknown, fromConnId: string | null) => void;
  onClose: () => void;
};

export type RoomSocket = {
  connId: () => string | null;
  send: (data: unknown, opts?: SendOpts) => void;
  close: () => void;
};

type SendOpts = {
  // Addresses one guest instead of the whole room.
  to?: string | null;
  // Stored under this id so a reloading guest gets the message back. A delta
  // reuses its message id on purpose: the row is replaced, not appended.
  msgId?: string;
  // Stores the room's title and character name rather than a message.
  meta?: boolean;
  // Deletes the room's stored state. The host closing the room is the normal
  // end of its life.
  closeRoom?: boolean;
};

export function openRoomSocket(
  roomId: string,
  events: RoomSocketEvents,
): RoomSocket {
  const topic = ROOM_TOPIC_PREFIX + roomId;
  const url = env.apiOrigin.replace(/^http/, "ws") + "/ws";
  const socket = new ReconnectingWebSocket(url, [], {
    connectionTimeout: 10_000,
    maxEnqueuedMessages: 16,
  });
  let connId: string | null = null;
  let pingTimer: ReturnType<typeof setInterval> | null = null;

  const stopPing = () => {
    if (pingTimer) clearInterval(pingTimer);
    pingTimer = null;
  };

  socket.addEventListener("open", () => {
    socket.send(JSON.stringify({ op: "subscribe", topics: [topic] }));
    stopPing();
    pingTimer = setInterval(() => {
      socket.send(JSON.stringify({ op: "ping" }));
    }, PING_MS);
  });

  socket.addEventListener("message", (event: MessageEvent<string>) => {
    try {
      const frame = rec(JSON.parse(event.data));
      if (!frame) return;
      if (frame.op === "hello") {
        // The server assigns this; it is the guest identity the host addresses,
        // replacing the PeerJS peer id.
        if (typeof frame.conn_id === "string") {
          connId = frame.conn_id;
          events.onOpen(frame.conn_id);
        }
        return;
      }
      if (frame.op !== "room" || typeof frame.data !== "string") return;
      const from = typeof frame.from === "string" ? frame.from : null;
      events.onFrame(JSON.parse(frame.data), from);
    } catch {
      // A malformed frame is dropped; the protocol parsers reject the rest.
    }
  });

  socket.addEventListener("close", () => {
    stopPing();
    events.onClose();
  });

  return {
    connId: () => connId,
    send: (data, opts) => {
      try {
        socket.send(
          JSON.stringify({
            op: "room",
            topic,
            conn_id: opts?.to ?? undefined,
            msg_id: opts?.msgId ?? undefined,
            meta: opts?.meta ?? undefined,
            close: opts?.closeRoom ?? undefined,
            data: JSON.stringify(data),
          }),
        );
      } catch {
        // The close handler reports a dead socket.
      }
    },
    close: () => {
      stopPing();
      socket.close();
    },
  };
}

// Full transcript for a guest who reloaded. Served over HTTP because a long
// room is far past the socket's frame limit.
export async function fetchRoomHistory(
  roomId: string,
): Promise<{ meta: unknown; messages: unknown[] }> {
  const url = `${env.apiOrigin}/api/notify/room?room=${encodeURIComponent(roomId)}`;
  const res = await fetch(url);
  const body = rec(await res.json());
  const data = rec(body?.data);
  if (!body?.success || !data) return { meta: null, messages: [] };
  const raw = Array.isArray(data.messages) ? data.messages : [];
  const messages: unknown[] = [];
  for (const row of raw) {
    if (typeof row !== "string") continue;
    try {
      messages.push(JSON.parse(row));
    } catch {
      // One unreadable row must not lose the rest of the transcript.
    }
  }
  let meta: unknown = null;
  if (typeof data.meta === "string" && data.meta) {
    try {
      meta = JSON.parse(data.meta);
    } catch {
      meta = null;
    }
  }
  return { meta, messages };
}
