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

export const watchedTopicsAtom = atom(
  (get) => get(notifyStoreAtom).topics ?? INITIAL_NOTIFY_STATE.topics,
  (get, set, value: string[]) => {
    set(notifyStoreAtom, { ...get(notifyStoreAtom), topics: value });
  },
);

export const mutedTopicsAtom = atom(
  (get) => get(notifyStoreAtom).mutedTopics ?? INITIAL_NOTIFY_STATE.mutedTopics,
  (get, set, value: string[]) => {
    set(notifyStoreAtom, { ...get(notifyStoreAtom), mutedTopics: value });
  },
);

// Topics that actually subscribe: watched minus per-entry muted.
export const activeTopicsAtom = atom((get) => {
  const muted = get(mutedTopicsAtom);
  return get(watchedTopicsAtom).filter((topic) => !muted.includes(topic));
});

export const pushEnabledAtom = atom(
  (get) => get(notifyStoreAtom).pushEnabled ?? false,
  (get, set, value: boolean) => {
    set(notifyStoreAtom, { ...get(notifyStoreAtom), pushEnabled: value });
  },
);

export const soundEnabledAtom = atom(
  (get) =>
    get(notifyStoreAtom).soundEnabled ?? INITIAL_NOTIFY_STATE.soundEnabled,
  (get, set, value: boolean) => {
    set(notifyStoreAtom, { ...get(notifyStoreAtom), soundEnabled: value });
  },
);

export const pushPromptSeenAtom = atom(
  (get) => get(notifyStoreAtom).pushPromptSeen ?? false,
  (get, set, value: boolean) => {
    set(notifyStoreAtom, { ...get(notifyStoreAtom), pushPromptSeen: value });
  },
);

export function modelTopic(model: string) {
  return `model:${model}`;
}

// Session-only notification feed: in-memory by design, cleared on reload.
export const notificationsAtom = atom<SessionNotification[]>([]);

export const notifyUnreadCountAtom = atom((get) =>
  get(notificationsAtom).reduce((acc, n) => acc + (n.read ? 0 : 1), 0),
);

export const notifyConnectedAtom = atom(false);
