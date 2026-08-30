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

export function parseHostMessage(raw: unknown): HostToGuest | null {
  if (!raw || typeof raw !== "object") return null;
  const msg = raw as Record<string, unknown>;
  switch (msg.type) {
    case "welcome":
    case "rejected":
    case "message-appended":
    case "stream-delta":
    case "stream-end":
    case "participants":
    case "turn-state":
    case "turn-failed":
    case "closed":
      return msg as HostToGuest;
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
