import { jotaiCookieStorage } from "@/lib/config/table-storage";
import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export const NOTIFY_STORE_KEY = "notify-store";

export const NOTIFY_TOPIC_FREE_MODELS = "free-models";

export type NotifyEventType =
  | "model_online"
  | "model_offline"
  | "model_price_change"
  | "model_added"
  | "model_removed"
  | "model_bulk_change";

export type NotifyEvent = {
  id: string;
  type: NotifyEventType;
  ts: number;
  topics: string[];
  data: {
    model: string;
    free: boolean;
    online?: boolean;
    cheapest_ratio?: number;
    prev_cheapest_ratio?: number;
    cheapest_group?: string;
    // model_bulk_change only: the server collapsed a mass transition (e.g. an
    // operator re-enabling hundreds of channels) into one digest.
    bulk_event?: Exclude<NotifyEventType, "model_bulk_change">;
    bulk_count?: number;
    bulk_free?: number;
    models?: string[];
  };
};

export type SessionNotification = NotifyEvent & { read: boolean };

export type NotifyState = {
  topics: string[];
  mutedTopics: string[];
  pushEnabled: boolean;
  pushPromptSeen: boolean;
  soundEnabled: boolean;
};

export const INITIAL_NOTIFY_STATE: NotifyState = {
  topics: [],
  mutedTopics: [],
  pushEnabled: false,
  pushPromptSeen: false,
  soundEnabled: true,
};

export const notifyStoreAtom = atomWithStorage<NotifyState>(
  NOTIFY_STORE_KEY,
  INITIAL_NOTIFY_STATE,
  jotaiCookieStorage,
);

function field<K extends keyof NotifyState>(key: K) {
  return atom(
    (get) => get(notifyStoreAtom)[key] ?? INITIAL_NOTIFY_STATE[key],
    (get, set, value: NotifyState[K]) => {
      set(notifyStoreAtom, { ...get(notifyStoreAtom), [key]: value });
    },
  );
}

export const watchedTopicsAtom = field("topics");
export const mutedTopicsAtom = field("mutedTopics");
export const pushEnabledAtom = field("pushEnabled");
export const soundEnabledAtom = field("soundEnabled");
export const pushPromptSeenAtom = field("pushPromptSeen");

// Topics that actually subscribe: watched minus per-entry muted.
export const activeTopicsAtom = atom((get) => {
  const muted = get(mutedTopicsAtom);
  return get(watchedTopicsAtom).filter((topic) => !muted.includes(topic));
});

export function modelTopic(model: string) {
  return `model:${model}`;
}

// Session-only notification feed: in-memory by design, cleared on reload.
export const notificationsAtom = atom<SessionNotification[]>([]);

export const notifyUnreadCountAtom = atom((get) =>
  get(notificationsAtom).reduce((acc, n) => acc + (n.read ? 0 : 1), 0),
);

export const notifyConnectedAtom = atom(false);
