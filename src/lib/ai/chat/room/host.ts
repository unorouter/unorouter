"use client";

import {
  readConvHistoryForSend,
  readLocalConversation,
  readLocalConversationSettings,
  readPrimaryCharacter,
} from "@/lib/db/client/data/chat/chat";
import { readLocalPersona } from "@/lib/db/client/data/rp/rp";
import { uid } from "@/lib/utils/base";
import {
  chatStore,
  convIdAtom,
  getThreadRuntime,
} from "@/store/chat-store";
import {
  roomErrorAtom,
  roomHostStatusAtom,
  roomIdAtom,
  roomParticipantsAtom,
  roomPendingAtom,
  roomTurnAtom,
} from "@/store/room-store";
import type { DataConnection, Peer } from "peerjs";
import {
  MAX_GUESTS,
  MAX_TURN_CHARS,
  ROOM_PROTOCOL_VERSION,
  parseGuestMessage,
  sanitizeName,
  type HostToGuest,
  type RoomMessage,
  type RoomParticipant,
  type TurnState,
} from "./protocol";

// A guest turn is handed to the runtime via append(), which is fire and forget:
// it swallows its own promise, so a turn that never starts (the conversation
// lock is held by another tab, the model errors before streaming) would leave
// the queue wedged forever. Nothing is awaited; the queue is released either by
// an observed run or by this timeout.
const TURN_START_TIMEOUT_MS = 15_000;

type Guest = {
  peerId: string;
  name: string;
  conn: DataConnection;
};

let peer: Peer | null = null;
let convId: string | null = null;
let guests = new Map<string, Guest>();
let pending = new Map<string, DataConnection>();
let turnTimer: ReturnType<typeof setTimeout> | null = null;
let awaitingRunFor: string | null = null;
const connName = new Map<string, string>();

function send(conn: DataConnection, msg: HostToGuest) {
  try {
    if (conn.open) conn.send(msg);
  } catch {
    // A dead connection surfaces through its own close handler.
  }
}

function broadcast(msg: HostToGuest) {
  for (const guest of guests.values()) send(guest.conn, msg);
}

function participants(): RoomParticipant[] {
  return [...guests.values()].map((g) => ({ peerId: g.peerId, name: g.name }));
}

function syncParticipants() {
  const list = participants();
  chatStore.set(roomParticipantsAtom, list);
  broadcast({ type: "participants", participants: list });
}

function setTurn(turn: TurnState) {
  chatStore.set(roomTurnAtom, turn);
  broadcast({ type: "turn-state", turn });
}

function clearTurnTimer() {
  if (turnTimer) clearTimeout(turnTimer);
  turnTimer = null;
}

function releaseTurn() {
  clearTurnTimer();
  awaitingRunFor = null;
  setTurn({ kind: "idle" });
}

// Host-side view of the conversation, flattened to what a guest is allowed to
// see: no character card, no preset, no metadata.
async function snapshot(): Promise<{
  title: string;
  characterName: string | null;
  messages: RoomMessage[];
}> {
  if (!convId) return { title: "", characterName: null, messages: [] };
  const [conv, character, history, persona] = await Promise.all([
    readLocalConversation(convId),
    readPrimaryCharacter(convId),
    readConvHistoryForSend(convId),
    hostPersonaName(),
  ]);
  const charName = character?.name ?? null;
  const messages = history.branch.map((m) => ({
    id: m.id,
    role: m.role === "user" ? ("user" as const) : ("assistant" as const),
    speaker: m.role === "user" ? persona : (charName ?? "Assistant"),
    text: m.parts
      .filter((p) => p.type === "text" && p.text)
      .map((p) => p.text)
      .join("\n")
      .trim(),
  }));
  return { title: conv?.title ?? "", characterName: charName, messages };
}

async function hostPersonaName(): Promise<string> {
  if (!convId) return "User";
  const settings = await readLocalConversationSettings(convId);
  const personaId = settings?.personaId;
  if (!personaId) return "User";
  const persona = await readLocalPersona(personaId);
  return persona?.name || "User";
}

async function admit(peerId: string) {
  const conn = pending.get(peerId);
  if (!conn) return;
  pending.delete(peerId);
  chatStore.set(
    roomPendingAtom,
    chatStore.get(roomPendingAtom).filter((p) => p.peerId !== peerId),
  );
  if (guests.size >= MAX_GUESTS) {
    send(conn, { type: "rejected", reason: "full" });
    conn.close();
    return;
  }
  const name = connName.get(peerId) ?? "Guest";
  guests.set(peerId, { peerId, name, conn });
  const snap = await snapshot();
  send(conn, {
    type: "welcome",
    version: ROOM_PROTOCOL_VERSION,
    title: snap.title,
    characterName: snap.characterName,
    messages: snap.messages,
    participants: participants(),
    turn: chatStore.get(roomTurnAtom),
  });
  syncParticipants();
}

function reject(peerId: string) {
  const conn = pending.get(peerId);
  pending.delete(peerId);
  connName.delete(peerId);
  chatStore.set(
    roomPendingAtom,
    chatStore.get(roomPendingAtom).filter((p) => p.peerId !== peerId),
  );
  if (conn) {
    send(conn, { type: "rejected", reason: "declined" });
    conn.close();
  }
}

function kick(peerId: string) {
  const guest = guests.get(peerId);
  if (!guest) return;
  guests.delete(peerId);
  send(guest.conn, { type: "closed" });
  guest.conn.close();
  // A kicked guest must not strand the queue on their unfinished turn.
  const turn = chatStore.get(roomTurnAtom);
  if (turn.kind === "writing" && turn.peerId === peerId) releaseTurn();
  syncParticipants();
}

async function onSubmitTurn(guest: Guest, text: string) {
  const trimmed = text.trim().slice(0, MAX_TURN_CHARS);
  if (!trimmed) return;
  if (chatStore.get(roomTurnAtom).kind !== "idle") {
    send(guest.conn, { type: "turn-failed", reason: "busy" });
    return;
  }
  const thread = getThreadRuntime();
  if (!thread) {
    send(guest.conn, { type: "turn-failed", reason: "error" });
    return;
  }
  setTurn({ kind: "writing", peerId: guest.peerId, name: guest.name });
  awaitingRunFor = guest.peerId;
  clearTurnTimer();
  turnTimer = setTimeout(() => {
    if (!awaitingRunFor) return;
    const stalled = guests.get(awaitingRunFor);
    if (stalled) send(stalled.conn, { type: "turn-failed", reason: "timeout" });
    releaseTurn();
  }, TURN_START_TIMEOUT_MS);

  // The model receives one `user` role with no speaker field, so two humans
  // sharing one persona are told apart only by this prefix. Same approach as
  // SillyTavern group chats.
  thread.append(`${guest.name}: ${trimmed}`);
}

export function onRunStateChange(isRunning: boolean) {
  if (isRunning) {
    // The turn actually started, so the start timeout no longer applies.
    clearTurnTimer();
    awaitingRunFor = null;
    if (chatStore.get(roomTurnAtom).kind !== "generating")
      setTurn({ kind: "generating" });
    return;
  }
  if (chatStore.get(roomTurnAtom).kind === "generating") releaseTurn();
}

export function broadcastMessage(message: RoomMessage) {
  if (!peer) return;
  broadcast({ type: "message-appended", message });
}

export function broadcastDelta(id: string, text: string) {
  if (!peer) return;
  broadcast({ type: "stream-delta", id, text });
}

export function broadcastStreamEnd(id: string) {
  if (!peer) return;
  broadcast({ type: "stream-end", id });
}

export function isHosting() {
  return peer !== null;
}

export async function startRoom(): Promise<void> {
  if (peer) return;
  const active = chatStore.get(convIdAtom);
  if (!active) {
    chatStore.set(roomErrorAtom, "NO_CONVERSATION");
    chatStore.set(roomHostStatusAtom, "error");
    return;
  }
  convId = active;
  chatStore.set(roomHostStatusAtom, "starting");
  chatStore.set(roomErrorAtom, null);
  const { Peer } = await import("peerjs");
  const id = uid(24);
  const created = new Peer(id);
  peer = created;

  created.on("open", (openId) => {
    chatStore.set(roomIdAtom, openId);
    chatStore.set(roomHostStatusAtom, "open");
  });

  // RisuAI never handles this, so a broker outage or a duplicate id hangs on a
  // spinner with nothing shown.
  created.on("error", (err) => {
    chatStore.set(roomErrorAtom, err.type || "unknown");
    chatStore.set(roomHostStatusAtom, "error");
  });

  created.on("connection", (conn) => {
    conn.on("data", (raw) => {
      const msg = parseGuestMessage(raw);
      if (!msg) return;
      const known = guests.get(conn.peer);
      if (msg.type === "join") {
        if (known || pending.has(conn.peer)) return;
        if (msg.version !== ROOM_PROTOCOL_VERSION) {
          send(conn, { type: "rejected", reason: "version" });
          conn.close();
          return;
        }
        const name = sanitizeName(msg.name);
        connName.set(conn.peer, name);
        pending.set(conn.peer, conn);
        chatStore.set(roomPendingAtom, [
          ...chatStore.get(roomPendingAtom),
          { peerId: conn.peer, name },
        ]);
        return;
      }
      // Everything else requires an approved guest, so an unapproved peer
      // cannot spend the host's balance by skipping the handshake.
      if (!known) return;
      if (msg.type === "submit-turn") void onSubmitTurn(known, msg.text);
      if (msg.type === "leave") kick(known.peerId);
    });

    conn.on("close", () => {
      if (guests.has(conn.peer)) {
        guests.delete(conn.peer);
        const turn = chatStore.get(roomTurnAtom);
        if (turn.kind === "writing" && turn.peerId === conn.peer) releaseTurn();
        syncParticipants();
      }
      if (pending.delete(conn.peer)) {
        chatStore.set(
          roomPendingAtom,
          chatStore.get(roomPendingAtom).filter((p) => p.peerId !== conn.peer),
        );
      }
      connName.delete(conn.peer);
    });
  });
}

export function stopRoom() {
  clearTurnTimer();
  broadcast({ type: "closed" });
  for (const guest of guests.values()) guest.conn.close();
  for (const conn of pending.values()) conn.close();
  peer?.destroy();
  peer = null;
  convId = null;
  guests = new Map();
  pending = new Map();
  connName.clear();
  awaitingRunFor = null;
  chatStore.set(roomHostStatusAtom, "off");
  chatStore.set(roomIdAtom, null);
  chatStore.set(roomPendingAtom, []);
  chatStore.set(roomParticipantsAtom, []);
  chatStore.set(roomTurnAtom, { kind: "idle" });
}

export const roomActions = { admit, reject, kick };
