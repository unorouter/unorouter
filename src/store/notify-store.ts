import { jotaiCookieStorage, storeFieldAtom } from "@/lib/config/table-storage";
import type { NotifyEvent } from "@/lib/validation/notify";
import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export const NOTIFY_STORE_KEY = "notify-store";

export const NOTIFY_TOPIC_FREE_MODELS = "free-models";

export type { NotifyEvent, NotifyEventType } from "@/lib/validation/notify";

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

const field = <K extends keyof NotifyState>(key: K) =>
  storeFieldAtom(notifyStoreAtom, INITIAL_NOTIFY_STATE, key);

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
