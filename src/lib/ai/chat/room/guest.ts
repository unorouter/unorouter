"use client";

import {
  guestCharacterNameAtom,
  guestErrorAtom,
  guestMessagesAtom,
  guestParticipantsAtom,
  guestStatusAtom,
  guestTitleAtom,
  guestTurnAtom,
  roomStore,
} from "@/store/room-store";
import { logChatDebug } from "@/lib/utils/chat-debug-log";
import {
  MAX_TURN_CHARS,
  ROOM_PROTOCOL_VERSION,
  parseHostMessage,
  roomMessageFrom,
  sanitizeName,
  type GuestToHost,
  type RoomMessage,
} from "./protocol";
import {
  fetchRoomHistory,
  openRoomSocket,
  type RoomSocket,
} from "./room-socket";

// The guest opens no database. Everything it knows lives in these atoms and is
// gone when the tab closes, which is the whole reason a guest needs no account.
let socket: RoomSocket | null = null;

function reset() {
  roomStore.set(guestMessagesAtom, []);
  roomStore.set(guestParticipantsAtom, []);
  roomStore.set(guestTurnAtom, { kind: "idle" });
}

function send(msg: GuestToHost) {
  socket?.send(msg);
}

export function submitTurn(text: string) {
  const trimmed = text.trim().slice(0, MAX_TURN_CHARS);
  if (!trimmed) return;
  send({ type: "submit-turn", text: trimmed });
}

export async function joinRoom(roomId: string, rawName: string): Promise<void> {
  if (socket) return;
  const name = sanitizeName(rawName);
  roomStore.set(guestStatusAtom, "connecting");
  roomStore.set(guestErrorAtom, null);
  reset();

  socket = openRoomSocket(roomId, {
    onOpen: () => {
      roomStore.set(guestStatusAtom, "waiting");
      logChatDebug("room.guest_connect", {
        roomId,
        version: ROOM_PROTOCOL_VERSION,
      });
      send({ type: "join", version: ROOM_PROTOCOL_VERSION, name });
    },
    onClose: () => {
      if (roomStore.get(guestStatusAtom) === "joined")
        roomStore.set(guestStatusAtom, "closed");
    },
    onFrame: (raw) => {
      const msg = parseHostMessage(raw);
      if (!msg) return;
      switch (msg.type) {
        case "welcome":
          roomStore.set(guestTitleAtom, msg.title);
          roomStore.set(guestCharacterNameAtom, msg.characterName);
          roomStore.set(guestParticipantsAtom, msg.participants);
          roomStore.set(guestTurnAtom, msg.turn);
          roomStore.set(guestStatusAtom, "joined");
          // The transcript arrives over HTTP: a long room is far past the
          // socket's frame limit, and overflowing the outbound buffer would
          // drop the connection this is restoring.
          void loadHistory(roomId);
          logChatDebug("room.guest_welcome", { hostVersion: msg.version });
          break;
        case "rejected":
          roomStore.set(guestErrorAtom, msg.reason);
          roomStore.set(guestStatusAtom, "rejected");
          logChatDebug("room.guest_rejected", { reason: msg.reason });
          break;
        case "message-appended":
          roomStore.set(guestMessagesAtom, (prev) => {
            const next = prev.filter((m) => m.id !== msg.message.id);
            return [...next, msg.message];
          });
          break;
        case "stream-delta":
          roomStore.set(guestMessagesAtom, (prev) => {
            const found = prev.find((m) => m.id === msg.id);
            if (found)
              return prev.map((m) =>
                m.id === msg.id ? { ...m, text: msg.text } : m,
              );
            return [
              ...prev,
              {
                id: msg.id,
                role: "assistant" as const,
                speaker: roomStore.get(guestCharacterNameAtom) ?? "Assistant",
                text: msg.text,
              },
            ];
          });
          break;
        case "stream-end":
          break;
        case "participants":
          roomStore.set(guestParticipantsAtom, msg.participants);
          break;
        case "turn-state":
          roomStore.set(guestTurnAtom, msg.turn);
          // A new turn means the previous failure no longer describes anything.
          if (msg.turn.kind !== "idle") roomStore.set(guestErrorAtom, null);
          break;
        case "turn-failed":
          roomStore.set(guestErrorAtom, msg.reason);
          break;
        case "closed":
          roomStore.set(guestErrorAtom, null);
          roomStore.set(guestStatusAtom, "closed");
          logChatDebug("room.guest_closed", {});
          break;
      }
    },
  });
}

// Merges the stored transcript UNDER anything already received live, so a
// message that arrived while this was in flight is not overwritten by an older
// copy of itself.
async function loadHistory(roomId: string) {
  const { messages } = await fetchRoomHistory(roomId).catch(() => ({
    messages: [] as unknown[],
  }));
  // Rows are stored as the frame that produced them, so a message-appended and
  // a stream-delta unwrap differently.
  const stored: RoomMessage[] = [];
  for (const raw of messages) {
    const frame = parseHostMessage(raw);
    if (frame?.type === "message-appended") stored.push(frame.message);
    else if (frame?.type === "stream-delta") {
      const parsed = roomMessageFrom({
        id: frame.id,
        role: "assistant",
        speaker: roomStore.get(guestCharacterNameAtom) ?? "Assistant",
        text: frame.text,
      });
      if (parsed) stored.push(parsed);
    }
  }
  if (!stored.length) return;
  roomStore.set(guestMessagesAtom, (prev) => {
    const live = new Set(prev.map((m) => m.id));
    return [...stored.filter((m) => !live.has(m.id)), ...prev];
  });
  logChatDebug("room.guest_history", { messages: stored.length });
}

export function leaveRoom() {
  send({ type: "leave" });
  socket?.close();
  socket = null;
  reset();
}
