import { GUEST_USER_ID } from "@/lib/config/constants";
import { jotaiCookieStorage } from "@/lib/config/table-storage";
import { LOCAL_USER_ID_COOKIE } from "@/lib/config/constants";
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
  group: string | null;
  webSearch: boolean;
  defaults: StreamOverrides;
  loadout: ChatLoadout;
  samplerMemoryByModel: Record<string, ModelSamplerMemory>;
  showStatsTokens: boolean;
  showStatsCost: boolean;
  showStatsMessages: boolean;
};

export const INITIAL_CHAT_STATE: ChatState = {
  model: null,
  group: null,
  webSearch: false,
  defaults: {},
  loadout: EMPTY_LOADOUT,
  samplerMemoryByModel: {},
  showStatsTokens: false,
  showStatsCost: true,
  showStatsMessages: false,
};

export const chatStoreAtom = atomWithStorage<ChatState>(
  CHAT_STORE_KEY,
  INITIAL_CHAT_STATE,
  jotaiCookieStorage,
);

export const chatModelAtom = atom(
  (get) => get(chatStoreAtom).model ?? INITIAL_CHAT_STATE.model,
  (get, set, value: string | null) => {
    set(chatStoreAtom, { ...get(chatStoreAtom), model: value });
  },
);

export const chatGroupAtom = atom(
  (get) => get(chatStoreAtom).group ?? INITIAL_CHAT_STATE.group,
  (get, set, value: string | null) => {
    set(chatStoreAtom, { ...get(chatStoreAtom), group: value });
  },
);

export const chatWebSearchAtom = atom(
  (get) => get(chatStoreAtom).webSearch ?? INITIAL_CHAT_STATE.webSearch,
  (get, set, value: boolean) => {
    set(chatStoreAtom, { ...get(chatStoreAtom), webSearch: value });
  },
);

export const showStatsTokensAtom = atom(
  (get) =>
    get(chatStoreAtom).showStatsTokens ?? INITIAL_CHAT_STATE.showStatsTokens,
  (get, set, value: boolean) => {
    set(chatStoreAtom, { ...get(chatStoreAtom), showStatsTokens: value });
  },
);

export const showStatsCostAtom = atom(
  (get) => get(chatStoreAtom).showStatsCost ?? INITIAL_CHAT_STATE.showStatsCost,
  (get, set, value: boolean) => {
    set(chatStoreAtom, { ...get(chatStoreAtom), showStatsCost: value });
  },
);

export const showStatsMessagesAtom = atom(
  (get) =>
    get(chatStoreAtom).showStatsMessages ??
    INITIAL_CHAT_STATE.showStatsMessages,
  (get, set, value: boolean) => {
    set(chatStoreAtom, { ...get(chatStoreAtom), showStatsMessages: value });
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
  sendEmpty: () => Promise<void>;
};

export type ChatRuntimeState = {
  convId: string | null;
  historyLoaded: boolean;
  settingsOpen: boolean;
  lastStreamError: {
    message: string;
    at: number;
    code?: string;
    status?: number;
    requestId?: string;
  } | null;
  speakingCharacterId: string | null;
  greetingIndex: number;
};

const INITIAL_RUNTIME_STATE: ChatRuntimeState = {
  convId: null,
  historyLoaded: false,
  settingsOpen: false,
  lastStreamError: null,
  speakingCharacterId: null,
  greetingIndex: 0,
};

const chatRuntimeAtom = atom<ChatRuntimeState>(INITIAL_RUNTIME_STATE);

function runtimeField<K extends keyof ChatRuntimeState>(key: K) {
  return atom(
    (get) => get(chatRuntimeAtom)[key],
    (get, set, value: ChatRuntimeState[K]) => {
      set(chatRuntimeAtom, { ...get(chatRuntimeAtom), [key]: value });
    },
  );
}

export const convIdAtom = runtimeField("convId");
export const historyLoadedAtom = runtimeField("historyLoaded");
export const conversationSettingsOpenAtom = runtimeField("settingsOpen");
export const lastStreamErrorAtom = runtimeField("lastStreamError");
export const speakingCharacterIdAtom = runtimeField("speakingCharacterId");
export const greetingIndexAtom = runtimeField("greetingIndex");

export const chatHelpersAtom = atom<ChatHelpersRef | null>(null);

export const globalVarsAtom = atomWithStorage<string>(
  "rp-global-vars",
  "{}",
  undefined,
  { getOnInit: true },
);

// Plain (unsealed) twin of the signed user-id cookie, set at the OAuth
// callback. Only selects which local OPFS file to open client-side, so it
// carries no server trust; tampering just points the user at another of
// their own local DBs. LocalUserIdSync backfills it from the auth query for
// sessions created before the twin cookie existed.
export const localUserIdAtom = atomWithStorage<number>(
  LOCAL_USER_ID_COOKIE,
  GUEST_USER_ID,
  jotaiCookieStorage,
);

export const chatStore = createStore();

// Apply a live-thread message patch, tolerating a momentarily-null helpers
// bridge. The bridge (chatHelpersAtom) is cleared/re-set during thread swaps, so
// a delete/edit firing in that window would silently no-op and the change would
// only show after a refresh. If the bridge is null now, wait for the next
// non-null value (capped) and apply once.
export function patchLiveMessages(
  updater: (msgs: unknown[]) => unknown[],
): void {
  const helpers = chatStore.get(chatHelpersAtom);
  if (helpers) {
    helpers.setMessages(updater);
    return;
  }
  let done = false;
  const apply = (h: ChatHelpersRef | null) => {
    if (done || !h) return;
    done = true;
    unsub();
    clearTimeout(timer);
    h.setMessages(updater);
  };
  const unsub = chatStore.sub(chatHelpersAtom, () =>
    apply(chatStore.get(chatHelpersAtom)),
  );
  const timer = setTimeout(() => {
    done = true;
    unsub();
  }, 5000);
}

export function ensureConvId(): string {
  const id = chatStore.get(convIdAtom) ?? uid();
  chatStore.set(convIdAtom, id);
  return id;
}

export function freshConvId(): string {
  const id = uid();
  chatStore.set(convIdAtom, id);
  return id;
}
