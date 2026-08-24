import { jotaiCookieStorage, storeFieldAtom } from "@/lib/config/table-storage";
import type { StreamOverrides } from "@/lib/validation/chat";
import { logChatDebug } from "@/lib/utils/chat-debug-log";
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

// Both halves are load-bearing, and this is the only cookie store whose values
// reach server-rendered HTML (the model name in ChatControls). getOnInit makes
// the client's first pass read the cookie; ChatStoreProvider makes the server
// read the same one, so both renders start identical. Without getOnInit a write
// during the deferred window spreads INITIAL_CHAT_STATE back over the cookie and
// drops every field it did not name (the provider pin, the maxTokens revert of
// 1a080093). Without the provider the two renders differ: React #418.
export const chatStoreAtom = atomWithStorage<ChatState>(
  CHAT_STORE_KEY,
  INITIAL_CHAT_STATE,
  jotaiCookieStorage,
  { getOnInit: true },
);

const storeField = <K extends keyof ChatState>(key: K) =>
  storeFieldAtom(chatStoreAtom, INITIAL_CHAT_STATE, key);

export const chatModelAtom = storeField("model");
export const chatWebSearchAtom = storeField("webSearch");
export const chatDefaultsAtom = storeField("defaults");
export const chatLoadoutAtom = storeField("loadout");
export const samplerMemoryByModelAtom = storeField("samplerMemoryByModel");
export const showStatsTokensAtom = storeField("showStatsTokens");
export const showStatsCostAtom = storeField("showStatsCost");
export const showStatsMessagesAtom = storeField("showStatsMessages");

export const groupByModelAtom = atom(
  (get) => get(chatStoreAtom).groupByModel ?? {},
);

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

export const activeConvOverridesAtom = atom<StreamOverrides | null>(null);

export const autoScrollStreamAtom = atom((get) => {
  const conv = get(activeConvOverridesAtom)?.autoScrollStream;
  if (conv !== null && conv !== undefined) return conv;
  const def = get(chatDefaultsAtom).autoScrollStream;
  return def ?? true;
});

export const globalVarsAtom = atomWithStorage<string>(
  "rp-global-vars",
  "{}",
  undefined,
  { getOnInit: true },
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

export const assistantRuntimeAtom = atom<AssistantRuntime | null>(null);

// Editing state is per-message in assistant-ui, but the scroll-to-bottom button
// lives at thread level and sits directly over the edit box, so it needs to know
// that some message is being edited.
export const messageEditingAtom = atom(false);

export const chatStore = createStore();

type LiveThreadOps = {
  setMessages: (updater: (msgs: unknown[]) => unknown[]) => void;
  clearError: () => void;
};

// Threads overlap during a conversation switch: the outgoing one unmounts AFTER the
// incoming one mounts. Keyed by conversation so an unmounting thread can only remove
// its own entry, and an async result reaches the chat it was computed for.
const liveThreads = new Map<string, LiveThreadOps>();

export function registerLiveThread(
  convId: string,
  ops: LiveThreadOps,
): () => void {
  liveThreads.set(convId, ops);
  return () => {
    if (liveThreads.get(convId) === ops) liveThreads.delete(convId);
  };
}

function activeOps(): LiveThreadOps | undefined {
  const convId = chatStore.get(convIdAtom);
  return convId ? liveThreads.get(convId) : undefined;
}

export function getThreadRuntime() {
  return chatStore.get(assistantRuntimeAtom)?.thread ?? null;
}

export function setLiveMessages(
  updater: (msgs: unknown[]) => unknown[],
  forConvId?: string,
): void {
  const ops = forConvId ? liveThreads.get(forConvId) : activeOps();
  ops?.setMessages(updater);
}

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

export function clearLiveError(): void {
  activeOps()?.clearError();
}

export async function reloadLiveThreadFromDb(convId: string): Promise<void> {
  if (chatStore.get(convIdAtom) !== convId) return;
  const { readActiveBranchParts } =
    await import("@/lib/db/client/data/chat/chat");
  const live = await readActiveBranchParts(convId);
  setLiveMessages(() => live, convId);
}

export function ensureConvId(): string {
  const id = chatStore.get(convIdAtom) ?? uid();
  chatStore.set(convIdAtom, id);
  return id;
}

// A new chat must get a FRESH id and never inherit whatever convIdAtom holds: the
// route still points at the previous conversation after New Chat, so that thread
// re-activates and refills the atom, and adopting it appended the new chat's first
// message to the old conversation (the merge bug, regressed once already).
//
// Keyed by the aui-local thread id so the two creation paths agree: whichever of
// the send wrapper and the thread-list initializer runs first mints, the other
// adopts, and neither can pick up a DIFFERENT thread's conversation.
const convIdByLocalThread = new Map<string, string>();

// Which id a new chat got is not the useful fact; whether it was MINTED or picked
// up from somewhere is. `displaced` is what the atom held at the time, so a merge
// shows up directly as a claim landing on a conversation that already existed.
function logConvIdClaim(
  kind: "mint" | "reuse",
  convId: string,
  localThreadId: string | undefined,
  displaced: string | null,
): void {
  logChatDebug("conv.id_claimed", {
    kind,
    convId,
    localThreadId: localThreadId ?? null,
    displaced,
  });
}

export function freshConvId(localThreadId?: string): string {
  const displaced = chatStore.get(convIdAtom);
  if (localThreadId) {
    const existing = convIdByLocalThread.get(localThreadId);
    if (existing) {
      chatStore.set(convIdAtom, existing);
      logConvIdClaim("reuse", existing, localThreadId, displaced);
      return existing;
    }
  }
  const id = uid();
  if (localThreadId) convIdByLocalThread.set(localThreadId, id);
  chatStore.set(convIdAtom, id);
  logConvIdClaim("mint", id, localThreadId, displaced);
  return id;
}
