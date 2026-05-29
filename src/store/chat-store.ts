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

// No getOnInit: cookie storage is client-only; would diverge SSR/first render.
const chatStoreAtom = atomWithStorage<ChatState>(
  CHAT_STORE_KEY,
  INITIAL_CHAT_STATE,
  jotaiCookieStorage,
);

// Per-field fallback covers older cookie schema.
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
  getMessages: () => ReadonlyArray<unknown>;
};

// In-memory: active stream convId + assistant-ui helpers; plain atoms for sync stream callbacks.
export const convIdAtom = atom<string | null>(null);
export const chatHelpersAtom = atom<ChatHelpersRef | null>(null);

// Offline queued-send replay work list, published by useQueuedSendScheduler and
// drained by the runtime bridge (only the active thread auto-replays). convIds
// of conversations whose active leaf is an unanswered user turn.
export const queuedReplayAtom = atom<string[]>([]);

// Non-React stream callbacks read via chatStore.get/set.
export const chatStore = createStore();

// Returns active convId, generating fresh when unset; shared across transport/history/init.
export function ensureConvId(): string {
  const id = chatStore.get(convIdAtom) ?? uid();
  chatStore.set(convIdAtom, id);
  return id;
}
