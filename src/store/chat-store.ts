import { jotaiCookieStorage } from "@/lib/config/table-storage";
import { atom, createStore } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { getCookie } from "cookies-next/client";

export const CHAT_STORE_KEY = "chat-store";

export type ChatState = {
  model: string | null;
};

export const INITIAL_CHAT_STATE: ChatState = {
  model: null,
};

export const chatStoreAtom = atomWithStorage<ChatState>(
  CHAT_STORE_KEY,
  INITIAL_CHAT_STATE,
  jotaiCookieStorage,
);

export const chatModelAtom = atom(
  (get) => get(chatStoreAtom).model,
  (get, set, value: string | null) => {
    set(chatStoreAtom, { ...get(chatStoreAtom), model: value });
  },
);

/** Active conversation ID (set by remoteId or pre-generated for new threads). */
export const convIdAtom = atom<string | null>(null);

export const chatStore = createStore();

export const getChatModel = (): string | null => {
  const fromAtom = chatStore.get(chatModelAtom);
  if (fromAtom) return fromAtom;
  try {
    const raw = getCookie(CHAT_STORE_KEY);
    if (raw) return (JSON.parse(String(raw)) as ChatState).model;
  } catch {}
  return null;
};

export const getConvId = () => chatStore.get(convIdAtom);
export const setConvId = (id: string | null) => chatStore.set(convIdAtom, id);

/** Per-message metadata (model, tokens, cost) keyed by message index. */
export type MessageMeta = {
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  cost: number | null;
};
export const messageMetaAtom = atom<MessageMeta[]>([]);
export const setMessageMeta = (meta: MessageMeta[]) =>
  chatStore.set(messageMetaAtom, meta);
