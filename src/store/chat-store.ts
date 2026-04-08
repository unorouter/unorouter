import { GUEST_CONVS_COOKIE } from "@/lib/config/constants";
import { jotaiCookieStorage } from "@/lib/config/table-storage";
import { atom, createStore } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { getCookie } from "cookies-next/client";

export const CHAT_STORE_KEY = "chat-store";

export type ChatState = {
  model: string | null;
  webSearch: boolean;
};

export const INITIAL_CHAT_STATE: ChatState = {
  model: null,
  webSearch: false,
};

export const chatStoreAtom = atomWithStorage<ChatState>(
  CHAT_STORE_KEY,
  INITIAL_CHAT_STATE,
  jotaiCookieStorage,
);

export const chatModelAtom = atom(
  (get) => get(chatStoreAtom).model,
  (get, set, value: string | null) => {
    set(chatStoreAtom, { ...get(chatStoreAtom), model: value });
  },
);

export const chatWebSearchAtom = atom(
  (get) => get(chatStoreAtom).webSearch,
  (get, set, value: boolean) => {
    set(chatStoreAtom, { ...get(chatStoreAtom), webSearch: value });
  },
);

export const chatStore = createStore();

export const getChatModel = (): string | null => {
  const fromAtom = chatStore.get(chatModelAtom);
  if (fromAtom) return fromAtom;
  try {
    const raw = getCookie(CHAT_STORE_KEY);
    if (raw) return (JSON.parse(String(raw)) as ChatState).model;
  } catch {}
  return null;
};

export const getChatWebSearch = (): boolean => {
  try {
    const raw = getCookie(CHAT_STORE_KEY);
    if (raw) return (JSON.parse(String(raw)) as ChatState).webSearch ?? false;
  } catch {}
  return false;
};

/** Active conversation ID. Plain variable (not reactive, only read imperatively). */
let _convId: string | null = null;
export const getConvId = () => _convId;
export const setConvId = (id: string | null) => {
  _convId = id;
};

/** Scroll control for infinite message loading. Written by useLoadedMessages, read by Chat. */
export type ScrollControl = {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
};

let _scrollControl: ScrollControl = {
  hasNextPage: false,
  isFetchingNextPage: false,
  fetchNextPage: () => {},
};

export const getScrollControl = () => _scrollControl;
export const setScrollControl = (ctrl: ScrollControl) => {
  _scrollControl = ctrl;
};

// ---------------------------------------------------------------------------
// Guest (anonymous) conversation IDs — persisted in a cookie
// ---------------------------------------------------------------------------

export const guestConvsAtom = atomWithStorage<string[]>(
  GUEST_CONVS_COOKIE,
  [],
  jotaiCookieStorage,
);

export function getGuestConvIds(): string[] {
  try {
    const raw = getCookie(GUEST_CONVS_COOKIE);
    if (raw) return JSON.parse(String(raw)) as string[];
  } catch {}
  return [];
}

export function addGuestConvId(id: string) {
  const ids = getGuestConvIds();
  if (!ids.includes(id)) {
    chatStore.set(guestConvsAtom, [...ids, id]);
  }
}

export function removeGuestConvId(id: string) {
  const ids = getGuestConvIds();
  chatStore.set(
    guestConvsAtom,
    ids.filter((i) => i !== id),
  );
}

export function clearGuestConvIds() {
  chatStore.set(guestConvsAtom, []);
}
