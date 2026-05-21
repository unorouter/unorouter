import { jotaiCookieStorage } from "@/lib/config/table-storage";
import type { StreamOverrides } from "@/lib/validation/chat";
import { uid } from "@/lib/utils/base";
import { atom, createStore } from "jotai";
import { atomWithStorage } from "jotai/utils";

const CHAT_STORE_KEY = "chat-store";

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

type ChatState = {
  model: string | null;
  webSearch: boolean;
  defaults: StreamOverrides;
  samplerMemoryByModel: Record<string, ModelSamplerMemory>;
};

const INITIAL_CHAT_STATE: ChatState = {
  model: null,
  webSearch: false,
  defaults: {},
  samplerMemoryByModel: {},
};

// No getOnInit: the cookie storage is client-only, so reading it eagerly would
// make SSR (initial value) and the first client render (cookie value) diverge
// and trip a hydration mismatch. The atom loads the cookie on first React
// subscription instead; stream callbacks run well after the UI has mounted.
const chatStoreAtom = atomWithStorage<ChatState>(
  CHAT_STORE_KEY,
  INITIAL_CHAT_STATE,
  jotaiCookieStorage,
);

// Selector getters fall back to INITIAL_CHAT_STATE per field so a cookie
// written by an older schema (missing keys) still yields defined values.
export const chatModelAtom = atom(
  (get) => get(chatStoreAtom).model ?? INITIAL_CHAT_STATE.model,
  (get, set, value: string | null) => {
    set(chatStoreAtom, { ...get(chatStoreAtom), model: value });
  },
);

export const chatWebSearchAtom = atom(
  (get) => get(chatStoreAtom).webSearch ?? INITIAL_CHAT_STATE.webSearch,
  (get, set, value: boolean) => {
    set(chatStoreAtom, { ...get(chatStoreAtom), webSearch: value });
  },
);

export const chatDefaultsAtom = atom(
  (get) => get(chatStoreAtom).defaults ?? INITIAL_CHAT_STATE.defaults,
  (get, set, value: StreamOverrides) => {
    set(chatStoreAtom, { ...get(chatStoreAtom), defaults: value });
  },
);

export const samplerMemoryByModelAtom = atom(
  (get) =>
    get(chatStoreAtom).samplerMemoryByModel ??
    INITIAL_CHAT_STATE.samplerMemoryByModel,
  (get, set, value: Record<string, ModelSamplerMemory>) => {
    set(chatStoreAtom, { ...get(chatStoreAtom), samplerMemoryByModel: value });
  },
);

export type ChatHelpersRef = {
  setMessages: (updater: (msgs: unknown[]) => unknown[]) => void;
  messages: ReadonlyArray<unknown>;
};

// In-memory only (no storage): the convId for the active stream and the live
// assistant-ui helpers ref. Plain atoms so non-React stream callbacks read or
// write them synchronously via chatStore.get/set.
export const convIdAtom = atom<string | null>(null);
export const chatHelpersAtom = atom<ChatHelpersRef | null>(null);

// Shared store. Mounted components subscribe to the storage atoms, which loads
// the cookie value; non-React stream callbacks then read it via chatStore.get.
export const chatStore = createStore();

// Returns the active convId, generating and storing a fresh one when none is
// set yet. A new thread's transport body, history append, attachment send and
// thread initialize all call this so they share a single pre-generated id.
export function ensureConvId(): string {
  const id = chatStore.get(convIdAtom) ?? uid();
  chatStore.set(convIdAtom, id);
  return id;
}
