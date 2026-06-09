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

// Sticky RP "loadout": the preset/persona/characters/lorebooks a new chat is
// auto-equipped with, so users don't re-bind every conversation. Seeded into
// each new conversation by the thread-list adapter's initialize().
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

type ChatState = {
  model: string | null;
  webSearch: boolean;
  defaults: StreamOverrides;
  loadout: ChatLoadout;
  samplerMemoryByModel: Record<string, ModelSamplerMemory>;
};

const INITIAL_CHAT_STATE: ChatState = {
  model: null,
  webSearch: false,
  defaults: {},
  loadout: EMPTY_LOADOUT,
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

export const chatLoadoutAtom = atom(
  (get) => get(chatStoreAtom).loadout ?? INITIAL_CHAT_STATE.loadout,
  (get, set, value: ChatLoadout) => {
    set(chatStoreAtom, { ...get(chatStoreAtom), loadout: value });
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

// Opens the conversation settings/overrides drawer. Shared so the active-config
// badge in the chat header can open the same drawer the actions menu owns.
export const conversationSettingsOpenAtom = atom(false);

// Per-user global macro variables (setglobalvar/getglobalvar). Serialized JSON
// map. localStorage-backed (can grow past the cookie size cap). Read into the
// stream chatContext; updated from the stream finish-meta writeback. Read/write
// from non-React callers via chatStore.get/set.
export const globalVarsAtom = atomWithStorage<string>(
  "rp-global-vars",
  "{}",
  undefined,
  { getOnInit: true },
);

// Multi-character rotation: which bound character speaks the CURRENT stream.
// The rotation loop sets it before each sequential send; the transport body
// reads it into the request so the assembler promotes that char to primary.
// In-memory (per-tab, per-turn), not persisted.
export const speakingCharacterIdAtom = atom<string | null>(null);

// Non-React stream callbacks read via chatStore.get/set.
export const chatStore = createStore();

// Returns active convId, generating fresh when unset; shared across transport/history/init.
export function ensureConvId(): string {
  const id = chatStore.get(convIdAtom) ?? uid();
  chatStore.set(convIdAtom, id);
  return id;
}
