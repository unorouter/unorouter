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

export type ChatFont = "sans" | "mono" | "display" | "serif" | "system";

export type ChatState = {
  model: string | null;
  webSearch: boolean;
  font: ChatFont;
};

export const INITIAL_CHAT_STATE: ChatState = {
  model: null,
  webSearch: false,
  font: "sans",
};

/**
 * Subset of StreamOverrides that's worth remembering per-model: switching
 * from Claude (no min_p) to GLM-5.1 (has min_p) restores the user's prior
 * GLM-5.1 sampler values rather than resetting them to global defaults.
 *
 * Only sampler/output knobs go here — system prompt, persona, characters,
 * lorebooks etc. are conversation-scoped, not model-scoped.
 */
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

/**
 * Default per-stream knobs used as the fallback when a conversation has no
 * `conversation_settings` row (guest convs). For logged-in users, the row is
 * seeded from this value at conversation creation time and edited via the
 * overrides drawer afterward. Persisted in a cookie so the SSR prefetch
 * already sees the user's preferences.
 */
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

export const chatFontAtom = atom(
  (get) => get(chatStoreAtom).font ?? "sans",
  (get, set, value: ChatFont) => {
    set(chatStoreAtom, { ...get(chatStoreAtom), font: value });
  },
);

/**
 * Per-model sampler memory. Keyed by model name (the same string that ends
 * up in the `model` field of /v1/chat/completions). Cookie-backed so SSR
 * sees the same values; small payload (one Pick<StreamOverrides, ...> per
 * model the user has actually touched) so cookie size stays manageable.
 */
export const samplerMemoryByModelAtom = atomWithStorage<
  Record<string, ModelSamplerMemory>
>(SAMPLER_MEMORY_KEY, {}, jotaiCookieStorage);

/** Read sampler memory for one model; returns {} when nothing remembered. */
export function getModelSamplerMemory(
  byModel: Record<string, ModelSamplerMemory>,
  model: string | null | undefined,
): ModelSamplerMemory {
  if (!model) return {};
  return byModel[model] ?? {};
}

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

/**
 * Active conversation ID. Plain variable, not an atom, because it needs
 * synchronous access from non-React code (stream service callbacks).
 * Version counter lets async consumers detect stale reads after awaits.
 */
let _convId: string | null = null;
export const getConvId = () => _convId;
export const setConvId = (id: string | null) => (_convId = id);

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
