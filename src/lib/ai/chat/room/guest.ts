"use client";

import { chatStore } from "@/store/chat-store";
import {
  guestCharacterNameAtom,
  guestErrorAtom,
  guestMessagesAtom,
  guestParticipantsAtom,
  guestStatusAtom,
  guestTitleAtom,
  guestTurnAtom,
} from "@/store/room-store";
import type { DataConnection, Peer } from "peerjs";
import {
  MAX_TURN_CHARS,
  ROOM_PROTOCOL_VERSION,
  parseHostMessage,
  sanitizeName,
  type GuestToHost,
} from "./protocol";

// The guest opens no database. Everything it knows lives in these atoms and is
// gone when the tab closes, which is the whole reason a guest needs no account.
let peer: Peer | null = null;
let conn: DataConnection | null = null;

function reset() {
  chatStore.set(guestMessagesAtom, []);
  chatStore.set(guestParticipantsAtom, []);
  chatStore.set(guestTurnAtom, { kind: "idle" });
}

function send(msg: GuestToHost) {
  try {
    if (conn?.open) conn.send(msg);
  } catch {
    // The close handler reports the failure.
  }
}

export function submitTurn(text: string) {
  const trimmed = text.trim().slice(0, MAX_TURN_CHARS);
  if (!trimmed) return;
  send({ type: "submit-turn", text: trimmed });
}

export async function joinRoom(roomId: string, rawName: string): Promise<void> {
  if (peer) return;
  const name = sanitizeName(rawName);
  chatStore.set(guestStatusAtom, "connecting");
  chatStore.set(guestErrorAtom, null);
  reset();

  const { Peer } = await import("peerjs");
  const created = new Peer();
  peer = created;

  created.on("error", (err) => {
    // peer-unavailable is the one a user actually hits: a stale or mistyped
    // room link. RisuAI shows nothing here and simply hangs.
    chatStore.set(guestErrorAtom, err.type || "unknown");
    chatStore.set(guestStatusAtom, "error");
  });

  created.on("open", () => {
    const link = created.connect(roomId, { reliable: true });
    conn = link;

    link.on("open", () => {
      chatStore.set(guestStatusAtom, "waiting");
      send({ type: "join", version: ROOM_PROTOCOL_VERSION, name });
    });

    link.on("data", (raw) => {
      const msg = parseHostMessage(raw);
      if (!msg) return;
      switch (msg.type) {
        case "welcome":
          chatStore.set(guestTitleAtom, msg.title);
          chatStore.set(guestCharacterNameAtom, msg.characterName);
          chatStore.set(guestMessagesAtom, msg.messages);
          chatStore.set(guestParticipantsAtom, msg.participants);
          chatStore.set(guestTurnAtom, msg.turn);
          chatStore.set(guestStatusAtom, "joined");
          break;
        case "rejected":
          chatStore.set(guestErrorAtom, msg.reason);
          chatStore.set(guestStatusAtom, "rejected");
          break;
        case "message-appended":
          chatStore.set(guestMessagesAtom, (prev) => {
            const next = prev.filter((m) => m.id !== msg.message.id);
            return [...next, msg.message];
          });
          break;
        case "stream-delta":
          chatStore.set(guestMessagesAtom, (prev) => {
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
                speaker: chatStore.get(guestCharacterNameAtom) ?? "Assistant",
                text: msg.text,
              },
            ];
          });
          break;
        case "stream-end":
          break;
        case "participants":
          chatStore.set(guestParticipantsAtom, msg.participants);
          break;
        case "turn-state":
          chatStore.set(guestTurnAtom, msg.turn);
          break;
        case "turn-failed":
          chatStore.set(guestErrorAtom, msg.reason);
          break;
        case "closed":
          chatStore.set(guestStatusAtom, "closed");
          break;
      }
    });

    link.on("close", () => {
      if (chatStore.get(guestStatusAtom) === "joined")
        chatStore.set(guestStatusAtom, "closed");
    });
  });
}

export function leaveRoom() {
  send({ type: "leave" });
  conn?.close();
  peer?.destroy();
  conn = null;
  peer = null;
  reset();
}
