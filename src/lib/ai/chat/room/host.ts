"use client";

import {
  readConvHistoryForSend,
  readLocalConversation,
  readLocalConversationBindings,
  readLocalConversationSettings,
  readPrimaryCharacter,
} from "@/lib/db/client/data/chat/chat";
import {
  readLocalCharacter,
  readLocalPersona,
} from "@/lib/db/client/data/rp/rp";
import { uid } from "@/lib/utils/base";
import { logChatDebug } from "@/lib/utils/chat-debug-log";
import { chatStore, convIdAtom, getThreadRuntime } from "@/store/chat-store";
import {
  roomErrorAtom,
  roomHostStatusAtom,
  roomIdAtom,
  roomParticipantsAtom,
  roomPendingAtom,
  roomTurnAtom,
} from "@/store/room-store";
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
import { openRoomSocket, type RoomSocket } from "./room-socket";

// A guest turn is handed to the runtime via append(), which is fire and forget:
// it swallows its own promise, so a turn that never starts (the conversation
// lock is held by another tab, the model errors before streaming) would leave
// the queue wedged forever. Nothing is awaited; the queue is released either by
// an observed run or by this timeout.
const TURN_START_TIMEOUT_MS = 15_000;

type Guest = {
  peerId: string;
  name: string;
};

let socket: RoomSocket | null = null;
let convId: string | null = null;
let guests = new Map<string, Guest>();
// Connections that have said "join" but have not been admitted. They are inert
// until the host approves, so holding the room id cannot spend the host's
// balance.
let pending = new Set<string>();
let turnTimer: ReturnType<typeof setTimeout> | null = null;
let awaitingRunFor: string | null = null;
const connName = new Map<string, string>();

// Addressed to one guest by connection id, which the server assigns and stamps
// on every frame, so a guest cannot claim to be another.
function send(peerId: string, msg: HostToGuest) {
  socket?.send(msg, { to: peerId });
}

function broadcast(msg: HostToGuest, opts?: { msgId?: string }) {
  socket?.send(msg, opts);
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
  logChatDebug("room.turn_state", { kind: turn.kind });
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

// The protocol carries text only, deliberately: an attachment is host data and
// a guest never receives it. A named placeholder beats a blank message.
const ATTACHMENT_PLACEHOLDER = "[attachment]";

function hasNonTextPart(parts: { type: string }[]): boolean {
  return parts.some((p) => p.type === "file");
}

// Host-side view of the conversation, flattened to what a guest is allowed to
// see: no character card, no preset, no metadata.
async function snapshot(): Promise<{
  title: string;
  characterName: string | null;
  messages: RoomMessage[];
}> {
  if (!convId) return { title: "", characterName: null, messages: [] };
  const [conv, history] = await Promise.all([
    readLocalConversation(convId),
    readConvHistoryForSend(convId),
  ]);
  const charName = cachedCharacter;
  const messages = history.branch.map((m) => {
    const role = m.role === "user" ? ("user" as const) : ("assistant" as const);
    const text = m.parts
      .filter((p) => p.type === "text" && p.text)
      .map((p) => p.text)
      .join("\n")
      .trim();
    return {
      id: m.id,
      role,
      // Same resolution the live broadcast uses, or a joining guest sees every
      // cast member's turn attributed to one name.
      speaker: speakerName(role, m.characterId ?? undefined),
      // A turn whose parts are all non-text (an image) would otherwise arrive
      // as an empty string and render as a gap in the guest's history.
      text: text || (hasNonTextPart(m.parts) ? ATTACHMENT_PLACEHOLDER : ""),
    };
  });
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
  if (!pending.has(peerId)) return;
  pending.delete(peerId);
  chatStore.set(
    roomPendingAtom,
    chatStore.get(roomPendingAtom).filter((p) => p.peerId !== peerId),
  );
  if (guests.size >= MAX_GUESTS) {
    logChatDebug("room.guest_rejected", { peerId, reason: "full" });
    send(peerId, { type: "rejected", reason: "full" });
    return;
  }
  const name = connName.get(peerId) ?? "Guest";
  guests.set(peerId, { peerId, name });
  const snap = await snapshot();
  // The transcript is published to the room's stored history, not carried in
  // the welcome: a long room is megabytes and would overrun the socket.
  publishSnapshot(snap);
  send(peerId, {
    type: "welcome",
    version: ROOM_PROTOCOL_VERSION,
    title: snap.title,
    characterName: snap.characterName,
    participants: participants(),
    turn: chatStore.get(roomTurnAtom),
  });
  logChatDebug("room.welcome_sent", {
    peerId,
    messages: snap.messages.length,
    blank: snap.messages.filter((m) => !m.text).length,
    guests: guests.size,
  });
  syncParticipants();
}

function reject(peerId: string) {
  const wasPending = pending.has(peerId);
  pending.delete(peerId);
  connName.delete(peerId);
  chatStore.set(
    roomPendingAtom,
    chatStore.get(roomPendingAtom).filter((p) => p.peerId !== peerId),
  );
  if (wasPending) {
    logChatDebug("room.guest_rejected", { peerId, reason: "declined" });
    send(peerId, { type: "rejected", reason: "declined" });
  }
}

function kick(peerId: string) {
  const guest = guests.get(peerId);
  if (!guest) return;
  guests.delete(peerId);
  logChatDebug("room.guest_leave", { peerId, reason: "kicked" });
  send(peerId, { type: "closed" });
  // A kicked guest must not strand the queue on their unfinished turn.
  const turn = chatStore.get(roomTurnAtom);
  if (turn.kind === "writing" && turn.peerId === peerId) releaseTurn();
  syncParticipants();
}

async function onSubmitTurn(guest: Guest, text: string) {
  const trimmed = text.trim().slice(0, MAX_TURN_CHARS);
  if (!trimmed) return;
  if (chatStore.get(roomTurnAtom).kind !== "idle") {
    logChatDebug("room.turn_failed", { peerId: guest.peerId, reason: "busy" });
    send(guest.peerId, { type: "turn-failed", reason: "busy" });
    return;
  }
  const thread = getThreadRuntime();
  if (!thread) {
    logChatDebug("room.turn_failed", { peerId: guest.peerId, reason: "error" });
    send(guest.peerId, { type: "turn-failed", reason: "error" });
    return;
  }
  logChatDebug("room.turn_submit", {
    peerId: guest.peerId,
    chars: trimmed.length,
  });
  setTurn({ kind: "writing", peerId: guest.peerId, name: guest.name });
  awaitingRunFor = guest.peerId;
  clearTurnTimer();
  turnTimer = setTimeout(() => {
    if (!awaitingRunFor) return;
    const stalled = guests.get(awaitingRunFor);
    logChatDebug("room.turn_failed", {
      peerId: awaitingRunFor,
      reason: "timeout",
    });
    if (stalled)
      send(stalled.peerId, { type: "turn-failed", reason: "timeout" });
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

// Names for the labels a guest sees. Resolved once when the room opens, since
// a guest never receives the character or persona rows themselves.
let cachedPersona = "User";
let cachedCharacter: string | null = null;

async function loadSpeakerNames() {
  groupNames.clear();
  cachedPersona = await hostPersonaName();
  const primary = convId ? await readPrimaryCharacter(convId) : null;
  cachedCharacter = primary?.name ?? null;
  if (!convId) return;
  const bindings = await readLocalConversationBindings(convId);
  for (const bound of bindings?.conversationCharacters ?? []) {
    const row = await readLocalCharacter(bound.characterId);
    if (row?.name) groupNames.set(bound.characterId, row.name);
  }
}

export function speakerName(
  role: "user" | "assistant",
  speakingCharacterId?: string,
): string {
  if (role === "user") return cachedPersona;
  const named = speakingCharacterId
    ? groupNames.get(speakingCharacterId)
    : undefined;
  return named ?? cachedCharacter ?? "Assistant";
}

const groupNames = new Map<string, string>();

export function broadcastMessage(message: RoomMessage) {
  if (!socket) return;
  broadcast({ type: "message-appended", message }, { msgId: message.id });
}

// A delta carries the whole accumulated text, so storing it REPLACES the row
// for that id rather than appending another copy of the same reply.
export function broadcastDelta(id: string, text: string) {
  if (!socket) return;
  broadcast({ type: "stream-delta", id, text }, { msgId: id });
}

export function broadcastStreamEnd(id: string) {
  if (!socket) return;
  broadcast({ type: "stream-end", id });
}

export function isHosting() {
  return socket !== null;
}

// A failed start leaves status "error" behind; without this the panel reopens
// still showing the old failure.
export function clearRoomError() {
  if (socket) return;
  chatStore.set(roomErrorAtom, null);
  chatStore.set(roomHostStatusAtom, "off");
}

// convId is passed in rather than read from convIdAtom: the runtime resolves
// the active conversation as `remoteId ?? convIdAtom`, and the atom alone is
// null on a thread that was opened by URL rather than created in this tab.
export async function startRoom(activeConvId: string | null): Promise<void> {
  if (socket) return;
  const active = activeConvId ?? chatStore.get(convIdAtom);
  if (!active) {
    chatStore.set(roomErrorAtom, "NO_CONVERSATION");
    chatStore.set(roomHostStatusAtom, "error");
    return;
  }
  convId = active;
  logChatDebug("room.start", { convId: active });
  chatStore.set(roomHostStatusAtom, "starting");
  chatStore.set(roomErrorAtom, null);
  await loadSpeakerNames();
  const id = uid(24);

  socket = openRoomSocket(id, {
    onOpen: () => {
      chatStore.set(roomIdAtom, id);
      chatStore.set(roomHostStatusAtom, "open");
      // Stored so a guest who reloads can name the room before the host has
      // sent anything else.
      void snapshot().then(publishSnapshot);
    },
    // The socket reconnects on its own, so a drop is not the end of the room.
    // Only the host closing it is.
    onClose: () => {},
    onFrame: (raw, from) => {
      if (!from) return;
      const msg = parseGuestMessage(raw);
      if (!msg) return;
      const known = guests.get(from);
      if (msg.type === "join") {
        if (known || pending.has(from)) return;
        if (msg.version !== ROOM_PROTOCOL_VERSION) {
          logChatDebug("room.guest_rejected", {
            peerId: from,
            reason: "version",
            guestVersion: msg.version,
            hostVersion: ROOM_PROTOCOL_VERSION,
          });
          send(from, { type: "rejected", reason: "version" });
          return;
        }
        // Anyone holding the room id can connect, so the waiting list needs
        // the same ceiling as the room: it is rendered per entry.
        if (pending.size + guests.size >= MAX_GUESTS) {
          logChatDebug("room.guest_rejected", { peerId: from, reason: "full" });
          send(from, { type: "rejected", reason: "full" });
          return;
        }
        const name = sanitizeName(msg.name);
        logChatDebug("room.guest_join", { peerId: from, name });
        connName.set(from, name);
        pending.add(from);
        chatStore.set(roomPendingAtom, [
          ...chatStore.get(roomPendingAtom),
          { peerId: from, name },
        ]);
        return;
      }
      // Everything else requires an approved guest, so an unapproved peer
      // cannot spend the host's balance by skipping the handshake.
      if (!known) return;
      if (msg.type === "submit-turn") void onSubmitTurn(known, msg.text);
      if (msg.type === "leave") kick(known.peerId);
    },
  });
}

// Seeds the room's stored history. A guest fetches this over HTTP instead of
// receiving it in the welcome, which a long room would not fit in.
function publishSnapshot(snap: {
  title: string;
  characterName: string | null;
  messages: RoomMessage[];
}) {
  socket?.send(
    { title: snap.title, characterName: snap.characterName },
    { meta: true },
  );
  for (const message of snap.messages) {
    socket?.send({ type: "message-appended", message }, { msgId: message.id });
  }
}

export function stopRoom() {
  if (socket) logChatDebug("room.stop", { guests: guests.size });
  clearTurnTimer();
  broadcast({ type: "closed" });
  // Deleting the stored room is part of closing it: the 24h expiry is the
  // backstop for a host who just closes the tab, not the normal path.
  socket?.send({ type: "closed" }, { closeRoom: true });
  socket?.close();
  socket = null;
  convId = null;
  guests = new Map();
  pending = new Set();
  connName.clear();
  awaitingRunFor = null;
  chatStore.set(roomHostStatusAtom, "off");
  chatStore.set(roomIdAtom, null);
  chatStore.set(roomPendingAtom, []);
  chatStore.set(roomParticipantsAtom, []);
  chatStore.set(roomTurnAtom, { kind: "idle" });
}

export const roomActions = { admit, reject, kick };
