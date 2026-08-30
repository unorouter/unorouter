// Wire format for peer-to-peer RP rooms. Deltas only: a guest never receives
// the character definition, the preset, or anything else that would leave the
// host's data sitting in someone else's browser.

export const ROOM_PROTOCOL_VERSION = 1;

export type RoomMessage = {
  id: string;
  role: "user" | "assistant";
  speaker: string;
  text: string;
};

export type RoomParticipant = {
  peerId: string;
  name: string;
};

// Nobody may type while a turn is in flight, so the composer state is derived
// from this one value rather than each side guessing.
export type TurnState =
  | { kind: "idle" }
  | { kind: "writing"; peerId: string; name: string }
  | { kind: "generating" };

export type HostToGuest =
  | {
      type: "welcome";
      version: number;
      title: string;
      characterName: string | null;
      messages: RoomMessage[];
      participants: RoomParticipant[];
      turn: TurnState;
    }
  | { type: "rejected"; reason: "declined" | "version" | "full" }
  | { type: "message-appended"; message: RoomMessage }
  | { type: "stream-delta"; id: string; text: string }
  | { type: "stream-end"; id: string }
  | { type: "participants"; participants: RoomParticipant[] }
  | { type: "turn-state"; turn: TurnState }
  | { type: "turn-failed"; reason: "busy" | "timeout" | "error" }
  | { type: "closed" };

export type GuestToHost =
  | { type: "join"; version: number; name: string }
  | { type: "submit-turn"; text: string }
  | { type: "leave" };

// PeerJS hands back whatever the other side serialised, so nothing arriving on
// a connection may be trusted to have the shape its type claims.
export function parseGuestMessage(raw: unknown): GuestToHost | null {
  if (!raw || typeof raw !== "object") return null;
  const msg = raw as Record<string, unknown>;
  switch (msg.type) {
    case "join":
      return typeof msg.version === "number" && typeof msg.name === "string"
        ? { type: "join", version: msg.version, name: msg.name }
        : null;
    case "submit-turn":
      return typeof msg.text === "string"
        ? { type: "submit-turn", text: msg.text }
        : null;
    case "leave":
      return { type: "leave" };
    default:
      return null;
  }
}

function str(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function roomMessage(v: unknown): RoomMessage | null {
  if (!v || typeof v !== "object") return null;
  const m = v as Record<string, unknown>;
  const id = str(m.id);
  const speaker = str(m.speaker);
  const text = str(m.text);
  if (id === null || speaker === null || text === null) return null;
  if (m.role !== "user" && m.role !== "assistant") return null;
  return { id, role: m.role, speaker, text };
}

function participant(v: unknown): RoomParticipant | null {
  if (!v || typeof v !== "object") return null;
  const p = v as Record<string, unknown>;
  const peerId = str(p.peerId);
  const name = str(p.name);
  return peerId !== null && name !== null ? { peerId, name } : null;
}

function mapAll<T>(v: unknown, f: (item: unknown) => T | null): T[] | null {
  if (!Array.isArray(v)) return null;
  const out: T[] = [];
  for (const item of v) {
    const parsed = f(item);
    if (parsed === null) return null;
    out.push(parsed);
  }
  return out;
}

function turnState(v: unknown): TurnState | null {
  if (!v || typeof v !== "object") return null;
  const t = v as Record<string, unknown>;
  if (t.kind === "idle" || t.kind === "generating") return { kind: t.kind };
  if (t.kind !== "writing") return null;
  const peerId = str(t.peerId);
  const name = str(t.name);
  return peerId !== null && name !== null
    ? { kind: "writing", peerId, name }
    : null;
}

export function parseHostMessage(raw: unknown): HostToGuest | null {
  if (!raw || typeof raw !== "object") return null;
  const msg = raw as Record<string, unknown>;
  switch (msg.type) {
    case "welcome": {
      const title = str(msg.title);
      const messages = mapAll(msg.messages, roomMessage);
      const participants = mapAll(msg.participants, participant);
      const turn = turnState(msg.turn);
      if (title === null || !messages || !participants || !turn) return null;
      return {
        type: "welcome",
        version: typeof msg.version === "number" ? msg.version : 0,
        title,
        characterName: str(msg.characterName),
        messages,
        participants,
        turn,
      };
    }
    case "rejected":
      return msg.reason === "declined" ||
        msg.reason === "version" ||
        msg.reason === "full"
        ? { type: "rejected", reason: msg.reason }
        : null;
    case "message-appended": {
      const message = roomMessage(msg.message);
      return message ? { type: "message-appended", message } : null;
    }
    case "stream-delta": {
      const id = str(msg.id);
      const text = str(msg.text);
      return id !== null && text !== null
        ? { type: "stream-delta", id, text }
        : null;
    }
    case "stream-end": {
      const id = str(msg.id);
      return id !== null ? { type: "stream-end", id } : null;
    }
    case "participants": {
      const participants = mapAll(msg.participants, participant);
      return participants ? { type: "participants", participants } : null;
    }
    case "turn-state": {
      const turn = turnState(msg.turn);
      return turn ? { type: "turn-state", turn } : null;
    }
    case "turn-failed":
      return msg.reason === "busy" ||
        msg.reason === "timeout" ||
        msg.reason === "error"
        ? { type: "turn-failed", reason: msg.reason }
        : null;
    case "closed":
      return { type: "closed" };
    default:
      return null;
  }
}

export const MAX_TURN_CHARS = 4000;
export const MAX_NAME_CHARS = 32;
export const MAX_GUESTS = 8;

export function sanitizeName(raw: string): string {
  const trimmed = raw.replace(/\s+/g, " ").trim().slice(0, MAX_NAME_CHARS);
  return trimmed || "Guest";
}
