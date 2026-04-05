import { jotaiCookieStorage } from "@/lib/config/table-storage";
import { atom, createStore } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { getCookie } from "cookies-next/client";

export const CHAT_STORE_KEY = "chat-store";

export type ChatState = {
  model: string | null;
  webSearch: boolean;
};

export const INITIAL_CHAT_STATE: ChatState = {
  model: null,
  webSearch: false,
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

export const chatWebSearchAtom = atom(
  (get) => get(chatStoreAtom).webSearch,
  (get, set, value: boolean) => {
    set(chatStoreAtom, { ...get(chatStoreAtom), webSearch: value });
  },
);

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

export const getChatWebSearch = (): boolean => {
  try {
    const raw = getCookie(CHAT_STORE_KEY);
    if (raw) return (JSON.parse(String(raw)) as ChatState).webSearch ?? false;
  } catch {}
  return false;
};

/** Active conversation ID. Plain variable (not reactive, only read imperatively). */
let _convId: string | null = null;
export const getConvId = () => _convId;
export const setConvId = (id: string | null) => {
  _convId = id;
};
