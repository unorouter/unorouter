import type {
  RoomMessage,
  RoomParticipant,
  TurnState,
} from "@/lib/ai/chat/room/protocol";
import { atom, createStore } from "jotai";

// The guest runs on its own store rather than the chat store: importing
// chatStore would pull the entire local-first data layer into a route whose
// whole point is that it never opens a database.
export const roomStore = createStore();

export type PendingJoin = {
  peerId: string;
  name: string;
};

export type RoomHostStatus = "off" | "starting" | "open" | "error";

// Host side: the room is an overlay on a conversation the host already owns,
// so nothing here duplicates chat state. Only who is connected and who may type.
export const roomHostStatusAtom = atom<RoomHostStatus>("off");
export const roomIdAtom = atom<string | null>(null);
export const roomErrorAtom = atom<string | null>(null);
export const roomPendingAtom = atom<PendingJoin[]>([]);
export const roomParticipantsAtom = atom<RoomParticipant[]>([]);
export const roomTurnAtom = atom<TurnState>({ kind: "idle" });

export type GuestStatus =
  "connecting" | "waiting" | "joined" | "rejected" | "closed" | "error";

// Guest side: the entire visible chat lives here, in memory, and dies with the
// tab. No database is opened on a guest at any point.
export const guestStatusAtom = atom<GuestStatus>("connecting");
export const guestErrorAtom = atom<string | null>(null);
export const guestMessagesAtom = atom<RoomMessage[]>([]);
export const guestTitleAtom = atom<string>("");
export const guestCharacterNameAtom = atom<string | null>(null);
export const guestParticipantsAtom = atom<RoomParticipant[]>([]);
export const guestTurnAtom = atom<TurnState>({ kind: "idle" });
