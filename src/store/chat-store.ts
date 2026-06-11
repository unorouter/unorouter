import { jotaiCookieStorage } from "@/lib/config/table-storage";
import type { StreamOverrides } from "@/lib/validation/chat";
import { uid } from "@/lib/utils/base";
import { atom, createStore } from "jotai";
import { atomWithStorage } from "jotai/utils";

export const CHAT_STORE_KEY = "chat-store";

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

// Sticky RP loadout auto-equipped on every new chat; seeded by the thread-list
// adapter's initialize().
export type ChatLoadout = {
  presetId: string | null;
  personaId: string | null;
  characterIds: string[];
  lorebookIds: string[];
};

const EMPTY_LOADOUT: ChatLoadout = {
  presetId: null,
  personaId: null,
  characterIds: [],
  lorebookIds: [],
};

export type ChatState = {
  model: string | null;
  webSearch: boolean;
  defaults: StreamOverrides;
  loadout: ChatLoadout;
  samplerMemoryByModel: Record<string, ModelSamplerMemory>;
};

export const INITIAL_CHAT_STATE: ChatState = {
  model: null,
  webSearch: false,
  defaults: {},
  loadout: EMPTY_LOADOUT,
  samplerMemoryByModel: {},
};

// SSR-hydrated from the cookie by ChatStoreProvider; no getOnInit needed.
export const chatStoreAtom = atomWithStorage<ChatState>(
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

export const chatLoadoutAtom = atom(
  (get) => get(chatStoreAtom).loadout ?? INITIAL_CHAT_STATE.loadout,
  (get, set, value: ChatLoadout) => {
    set(chatStoreAtom, { ...get(chatStoreAtom), loadout: value });
  },
);

// Greeting picked on the empty-thread preview (0 = firstMessage, i =
// alternateGreetings[i-1]); thread-list initialize seeds branches from it.
export const greetingIndexAtom = atom(0);

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
  // Argless send (Risu sendMain): resubmits history so a trailing unanswered
  // user turn gets its reply; same locked send path.
  sendEmpty: () => Promise<void>;
};

// In-memory: active stream convId + assistant-ui helpers; plain atoms for sync stream callbacks.
export const convIdAtom = atom<string | null>(null);

// True once the history adapter's first load() resolved; the thread welcome
// waits on it so a conv URL shows a skeleton instead of flashing the
// empty-thread welcome while messages load from the local DB.
export const historyLoadedAtom = atom(false);
export const chatHelpersAtom = atom<ChatHelpersRef | null>(null);

// Opens the conversation settings/overrides drawer. Shared so the active-config
// badge in the chat header can open the same drawer the actions menu owns.
export const conversationSettingsOpenAtom = atom(false);

// Per-user global macro vars (JSON map). localStorage-backed (can outgrow the
// cookie cap); read into chatContext, updated from finish-meta writeback.
export const globalVarsAtom = atomWithStorage<string>(
  "rp-global-vars",
  "{}",
  undefined,
  { getOnInit: true },
);

// Last stream failure, consumed by the history adapter so the failed run
// persists as an error node instead of an empty ghost branch.
export const lastStreamErrorAtom = atom<{ message: string; at: number } | null>(
  null,
);

// Speaking character for the current stream (multi-character rotation); in-memory per tab.
export const speakingCharacterIdAtom = atom<string | null>(null);

// Non-React stream callbacks read via chatStore.get/set.
export const chatStore = createStore();

// Returns active convId, generating fresh when unset; shared across transport/history/init.
export function ensureConvId(): string {
  const id = chatStore.get(convIdAtom) ?? uid();
  chatStore.set(convIdAtom, id);
  return id;
}
