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
  roomStore.set(guestMessagesAtom, []);
  roomStore.set(guestParticipantsAtom, []);
  roomStore.set(guestTurnAtom, { kind: "idle" });
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
  roomStore.set(guestStatusAtom, "connecting");
  roomStore.set(guestErrorAtom, null);
  reset();

  const { Peer } = await import("peerjs");
  const created = new Peer();
  peer = created;

  created.on("error", (err) => {
    // peer-unavailable is the one a user actually hits: a stale or mistyped
    // room link. RisuAI shows nothing here and simply hangs.
    roomStore.set(guestErrorAtom, err.type || "unknown");
    roomStore.set(guestStatusAtom, "error");
  });

  created.on("open", () => {
    const link = created.connect(roomId, { reliable: true });
    conn = link;

    link.on("open", () => {
      roomStore.set(guestStatusAtom, "waiting");
      send({ type: "join", version: ROOM_PROTOCOL_VERSION, name });
    });

    link.on("data", (raw) => {
      const msg = parseHostMessage(raw);
      if (!msg) return;
      switch (msg.type) {
        case "welcome":
          roomStore.set(guestTitleAtom, msg.title);
          roomStore.set(guestCharacterNameAtom, msg.characterName);
          roomStore.set(guestMessagesAtom, msg.messages);
          roomStore.set(guestParticipantsAtom, msg.participants);
          roomStore.set(guestTurnAtom, msg.turn);
          roomStore.set(guestStatusAtom, "joined");
          break;
        case "rejected":
          roomStore.set(guestErrorAtom, msg.reason);
          roomStore.set(guestStatusAtom, "rejected");
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
          break;
      }
    });

    link.on("close", () => {
      if (roomStore.get(guestStatusAtom) === "joined")
        roomStore.set(guestStatusAtom, "closed");
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
