import { GUEST_CONVS_COOKIE } from "@/lib/config/constants";
import { jotaiCookieStorage } from "@/lib/config/table-storage";
import { safeJsonParse } from "@/lib/utils/base";
import { getCookie } from "cookies-next/client";
import { atom, createStore } from "jotai";
import { atomWithStorage } from "jotai/utils";

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

function chatStateCookie(): ChatState {
  return safeJsonParse<ChatState>(
    getCookie(CHAT_STORE_KEY),
    INITIAL_CHAT_STATE,
  );
}

export const getChatModel = (): string | null =>
  chatStore.get(chatModelAtom) ?? chatStateCookie().model;

export const getChatWebSearch = (): boolean =>
  chatStore.get(chatWebSearchAtom) ?? chatStateCookie().webSearch;

/**
 * Active conversation ID. Plain variable, not an atom, because it needs
 * synchronous access from non-React code (stream service callbacks).
 * Version counter lets async consumers detect stale reads after awaits.
 */
let _convId: string | null = null;
export const getConvId = () => _convId;
export const setConvId = (id: string | null) => (_convId = id);

/**
 * Scroll control for infinite message loading. Plain mutable ref bridging
 * useLoadedMessages (writer) and the Chat component (reader). Not reactive
 * because it holds callback references, not serializable state.
 */
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

/**
 * AI SDK `useChat` helpers needed for in-place assistant-message edits.
 * Set by `ChatRuntimeHook` on every render so the assistant action bar can
 * mutate the message buffer without going through `composer.send()` (which
 * always regenerates) or the history adapter (which only handles append).
 *
 * `messages` is exposed read-only so the editor can introspect existing
 * parts (reasoning, tool calls) and preserve them when saving.
 */
export type ChatHelpersRef = {
  setMessages: (updater: (msgs: unknown[]) => unknown[]) => void;
  messages: ReadonlyArray<unknown>;
};

let _chatHelpers: ChatHelpersRef | null = null;
export const getChatHelpers = () => _chatHelpers;
export const setChatHelpers = (helpers: ChatHelpersRef | null) => {
  _chatHelpers = helpers;
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
  return safeJsonParse<string[]>(getCookie(GUEST_CONVS_COOKIE), []);
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
