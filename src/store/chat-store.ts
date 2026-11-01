import { splitCookieStorage, storeFieldAtom } from "@/lib/config/table-storage";
import type { StreamOverrides } from "@/lib/validation/chat";
import type { DbExportOptions } from "@/lib/db/client/data/diagnostics/db-export";
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

export type BestDeal = { enabled: boolean; pool: string[] };

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
  showThinkingTokens: boolean;
  pullToRefresh: boolean;
  bestDeal: BestDeal;
  priceSeen: Record<string, number>;
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
  showThinkingTokens: true,
  pullToRefresh: false,
  bestDeal: { enabled: false, pool: [] },
  priceSeen: {},
};

export const chatStoreStorage = splitCookieStorage<ChatState>([
  "defaults",
  "samplerMemoryByModel",
  "bestDeal",
  "priceSeen",
]);

// getOnInit is a load-bearing PAIR with ChatStoreProvider; neither may be removed alone.
export const chatStoreAtom = atomWithStorage<ChatState>(
  CHAT_STORE_KEY,
  INITIAL_CHAT_STATE,
  chatStoreStorage,
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
export const pullToRefreshAtom = storeField("pullToRefresh");
export const showThinkingTokensAtom = storeField("showThinkingTokens");
export const bestDealAtom = storeField("bestDeal");
export const priceSeenAtom = storeField("priceSeen");
export const bestDealDialogOpenAtom = atom(false);
// Models the gateway answered consent_required for, so the chat asks for
// consent even while the cached catalog or consent list says otherwise.
export const consentDemandedModelsAtom = atom<string[]>([]);

// A model the user picks by hand ends best deal mode; only its own pick keeps it.
export const chooseChatModelAtom = atom(null, (get, set, model: string) => {
  set(chatModelAtom, model);
  const bestDeal = get(bestDealAtom);
  if (bestDeal.enabled) set(bestDealAtom, { ...bestDeal, enabled: false });
});

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

export type DbTransferRequest =
  | { mode: "send"; opts: Required<DbExportOptions> }
  | { mode: "receive"; code?: string };
export const dbTransferAtom = atom<DbTransferRequest | null>(null);

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
    param?: string;
    status?: number;
    requestId?: string;
  } | null;
  speakingCharacterId: string | null;
  rotatingGroupTurn: boolean;
  greetingIndex: number;
  running: boolean;
  dirtyForms: number;
};

const INITIAL_RUNTIME_STATE: ChatRuntimeState = {
  convId: null,
  historyLoaded: false,
  settingsOpen: false,
  lastStreamError: null,
  speakingCharacterId: null,
  rotatingGroupTurn: false,
  greetingIndex: 0,
  running: false,
  dirtyForms: 0,
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
export const rotatingGroupTurnAtom = runtimeField("rotatingGroupTurn");
export const greetingIndexAtom = runtimeField("greetingIndex");
export const chatRunningAtom = runtimeField("running");
export const dirtyFormsAtom = runtimeField("dirtyForms");

export const assistantRuntimeAtom = atom<AssistantRuntime | null>(null);

export const messageEditingAtom = atom(false);

export const focusMemoryFieldAtom = atom(false);

export const chatStore = createStore();

type LiveThreadOps = {
  setMessages: (updater: (msgs: unknown[]) => unknown[]) => void;
  clearError: () => void;
};

// Threads overlap on a switch: the outgoing one unmounts AFTER the incoming one mounts.
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
  const active = chatStore.get(convIdAtom);
  if (active !== convId) {
    logChatDebug("thread.reload_skipped", { convId, active });
    return;
  }
  const { readActiveBranchParts } =
    await import("@/lib/db/client/data/chat/chat");
  const live = await readActiveBranchParts(convId);
  logChatDebug("thread.reload", { convId, messages: live.length });
  setLiveMessages(() => live, convId);
}

export function ensureConvId(): string {
  const id = chatStore.get(convIdAtom) ?? uid();
  chatStore.set(convIdAtom, id);
  return id;
}

// A new chat must never inherit convIdAtom: the stale thread refills it and the first
// message is appended to the OLD conversation.
const convIdByLocalThread = new Map<string, string>();

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
