import { GUEST_USER_ID } from "@/lib/config/constants";
import { jotaiCookieStorage } from "@/lib/config/table-storage";
import { LOCAL_USER_ID_COOKIE } from "@/lib/config/constants";
import type { StreamOverrides } from "@/lib/validation/chat";
import { uid } from "@/lib/utils/base";
import { atom, createStore } from "jotai";
import { atomWithStorage } from "jotai/utils";
import type { AssistantRuntime } from "@assistant-ui/react";

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
  groupByModel: Record<string, string>;
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
  groupByModel: {},
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

// The provider-group pin is keyed BY MODEL, not stored as one global value.
// A single value kept unpinning: a conv-load race rewrote it to null before
// the saved value arrived, and every model switch had to clear it because a
// group name only serves the model it embeds. Keyed by model, switching
// models (or reloading) just changes which entry is read; each model keeps
// its own pin until the user changes it.
export const chatGroupAtom = atom(
  (get) => {
    const state = get(chatStoreAtom);
    const model = state.model;
    if (!model) return null;
    return (state.groupByModel ?? {})[model] ?? null;
  },
  (get, set, value: string | null) => {
    const state = get(chatStoreAtom);
    const model = state.model;
    if (!model) return;
    const map = { ...(state.groupByModel ?? {}) };
    if (value === null || value === undefined) delete map[model];
    else map[model] = value;
    set(chatStoreAtom, { ...state, groupByModel: map });
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

// Active conversation's settings-row mirror for the stream body. Separate from
// chatDefaultsAtom: mirroring a sparse conv row into the cookie-persisted defaults
// wiped the user's sticky new-chat defaults (one atom served two masters).
export const activeConvOverridesAtom = atom<StreamOverrides | null>(null);

// Stream auto-scroll ("jump to most recent writing"): active conv override wins,
// else the sticky default, else on. Off lets the user read while it streams.
export const autoScrollStreamAtom = atom((get) => {
  const conv = get(activeConvOverridesAtom)?.autoScrollStream;
  if (conv !== null && conv !== undefined) return conv;
  const def = get(chatDefaultsAtom).autoScrollStream;
  return def ?? true;
});

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

// The live assistant-ui runtime, published once by ChatRuntimeProvider. Non-React
// callers (the history + thread-list adapters) reach message ops through it.
export const assistantRuntimeAtom = atom<AssistantRuntime | null>(null);

// useChat's error is read-only runtime state with no runtime reset method, so the
// in-tree hook publishes its clearError here for the delete path to call.
export const clearChatErrorAtom = atom<(() => void) | null>(null);

// assistant-ui exposes no single-message part mutator, and its AI-SDK runtime's
// import() does not re-render the live useChat messages. In-place part edits
// (message edit, task->media swap) therefore go through useChat.setMessages,
// published here by the in-tree hook. Delete/reset/startRun use runtime methods.
export const setLiveMessagesAtom = atom<
  ((updater: (msgs: unknown[]) => unknown[]) => void) | null
>(null);

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

export function getThreadRuntime() {
  return chatStore.get(assistantRuntimeAtom)?.thread ?? null;
}

// Update the live useChat message list directly. Used for ops the AI-SDK runtime
// does not re-render (in-place part edits, greeting seed, clear). The setter is
// torn down and re-published during thread swaps/mounts, and the greeting seed in
// thread-list initialize() can fire inside that window - so a null setter waits
// for the next published one (capped) instead of silently dropping the update.
export function setLiveMessages(updater: (msgs: unknown[]) => unknown[]): void {
  const setMessages = chatStore.get(setLiveMessagesAtom);
  if (setMessages) {
    setMessages(updater);
    return;
  }
  let done = false;
  const apply = () => {
    if (done) return;
    const next = chatStore.get(setLiveMessagesAtom);
    if (!next) return;
    done = true;
    unsub();
    clearTimeout(timer);
    next(updater);
  };
  const unsub = chatStore.sub(setLiveMessagesAtom, apply);
  const timer = setTimeout(() => {
    done = true;
    unsub();
    // A dropped update here means the on-screen thread (and therefore the
    // history the transport sends) no longer matches the DB.
    console.warn("setLiveMessages: bridge never published, update dropped");
  }, 5000);
}

// Replace one message's parts in the live thread. No-op if the bridge is absent -
// the DB write is the source of truth and a reload re-derives.
export function replaceMessageParts(
  msgId: string,
  mapParts: (parts: readonly unknown[]) => unknown[],
): void {
  setLiveMessages((msgs) =>
    (msgs as Array<{ id?: string; parts?: unknown[] }>).map((m) =>
      m.id === msgId ? { ...m, parts: mapParts(m.parts ?? []) } : m,
    ),
  );
}

// useChat's error is runtime-read-only state; the in-tree hook publishes clearError.
export function clearLiveError(): void {
  chatStore.get(clearChatErrorAtom)?.();
}

// Rebuild the live useChat array from the local DB's active branch. The array
// is the RENDER SOURCE and the transport sends it verbatim as the model's
// history, but useExternalHistory loads it exactly once per mount - so after an
// edit or delete the DB and the array diverge until a remount unless something
// re-syncs them. Users saw pre-edit text on screen AND the model answering the
// pre-edit prompt; this is the repair both paths call after their DB write.
export async function reloadLiveThreadFromDb(convId: string): Promise<void> {
  if (chatStore.get(convIdAtom) !== convId) return;
  const userId = chatStore.get(localUserIdAtom);
  const [dataMod, msgMod] = await Promise.all([
    import("@/lib/db/client/data/chat/chat"),
    import("@/lib/ai/chat/messages"),
  ]);
  const [msgs, items] = await Promise.all([
    dataMod.readLocalMessages(userId, convId),
    dataMod.readLocalMessageItems(userId, convId),
  ]);
  const joined = msgMod.joinItemsToMessages(msgs ?? [], items ?? []);
  const walked = msgMod.walkActiveBranch(
    joined as Array<{
      id: string;
      parentId: string | null;
      isActiveBranch?: boolean | null;
    }>,
  );
  const live = walked.path.map((m) => {
    const row = m as unknown as {
      id: string;
      role: string;
      items?: Parameters<typeof msgMod.itemsToParts>[0];
    };
    return {
      id: row.id,
      role: row.role,
      parts: msgMod.itemsToParts(row.items ?? []),
    };
  });
  // The conversation may have swapped while the DB reads ran.
  if (chatStore.get(convIdAtom) !== convId) return;
  setLiveMessages(() => live);
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
