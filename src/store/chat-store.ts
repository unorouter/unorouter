import { GUEST_CONVS_COOKIE } from "@/lib/config/constants";
import { jotaiCookieStorage } from "@/lib/config/table-storage";
import { safeJsonParse } from "@/lib/utils/base";
import type { StreamOverrides } from "@/lib/validation/chat";
import { getCookie } from "cookies-next/client";
import { atom, createStore } from "jotai";
import { atomWithStorage } from "jotai/utils";

export const CHAT_STORE_KEY = "chat-store";
export const CHAT_DEFAULTS_KEY = "chat-defaults";
export const SAMPLER_MEMORY_KEY = "chat-sampler-memory";

export type ChatState = {
  model: string | null;
  webSearch: boolean;
};

export const INITIAL_CHAT_STATE: ChatState = {
  model: null,
  webSearch: false,
};

export type ModelSamplerMemory = Pick<
  StreamOverrides,
  | "temperature"
  | "topP"
  | "topK"
  | "minP"
  | "topA"
  | "frequencyPenalty"
  | "presencePenalty"
  | "repetitionPenalty"
  | "maxTokens"
  | "reasoningEffort"
  | "extraBody"
>;

export const chatStoreAtom = atomWithStorage<ChatState>(
  CHAT_STORE_KEY,
  INITIAL_CHAT_STATE,
  jotaiCookieStorage,
);

export const INITIAL_CHAT_DEFAULTS: StreamOverrides = {};

export const chatDefaultsAtom = atomWithStorage<StreamOverrides>(
  CHAT_DEFAULTS_KEY,
  INITIAL_CHAT_DEFAULTS,
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

export const samplerMemoryByModelAtom = atomWithStorage<
  Record<string, ModelSamplerMemory>
>(SAMPLER_MEMORY_KEY, {}, jotaiCookieStorage);

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

export const getChatDefaults = (): StreamOverrides =>
  chatStore.get(chatDefaultsAtom) ??
  safeJsonParse<StreamOverrides>(getCookie(CHAT_DEFAULTS_KEY), {});

// Plain variable, not an atom: needs sync access from non-React stream callbacks.
let _convId: string | null = null;
export const getConvId = () => _convId;
export const setConvId = (id: string | null) => (_convId = id);

export type ChatHelpersRef = {
  setMessages: (updater: (msgs: unknown[]) => unknown[]) => void;
  messages: ReadonlyArray<unknown>;
};

let _chatHelpers: ChatHelpersRef | null = null;
export const getChatHelpers = () => _chatHelpers;
export const setChatHelpers = (helpers: ChatHelpersRef | null) => {
  _chatHelpers = helpers;
};

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
