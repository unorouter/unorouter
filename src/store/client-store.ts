import { jotaiCookieStorage } from "@/lib/config/table-storage";
import { OS } from "@/lib/types/enums";
import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export const CLIENT_STORE_KEY = "client-store";

export type ClientState = {
  apiKey: string | null;
  apiKeyRevealed: boolean;
  os: OS | undefined;
  newChatModel: string | null;
};

export const INITIAL_CLIENT_STATE: ClientState = {
  apiKey: null,
  apiKeyRevealed: false,
  os: OS.WINDOWS,
  newChatModel: null,
};

export const clientStoreAtom = atomWithStorage<ClientState>(
  CLIENT_STORE_KEY,
  INITIAL_CLIENT_STATE,
  jotaiCookieStorage,
);

export const apiKeyAtom = atom(
  (get) => get(clientStoreAtom).apiKey,
  (get, set, value: string | null) => {
    set(clientStoreAtom, { ...get(clientStoreAtom), apiKey: value });
  },
);

export const apiKeyRevealedAtom = atom(
  (get) => get(clientStoreAtom).apiKeyRevealed,
  (get, set, value: boolean) => {
    set(clientStoreAtom, { ...get(clientStoreAtom), apiKeyRevealed: value });
  },
);

export function obfuscateApiKey(key: string) {
  const prefix = key.slice(0, 6);
  const suffix = key.slice(-3);
  return `${prefix}...${suffix}`;
}

export const osAtom = atom(
  (get) => get(clientStoreAtom).os,
  (get, set, value: OS | undefined) => {
    set(clientStoreAtom, { ...get(clientStoreAtom), os: value });
  },
);

// Chat conversation selection (not persisted, URL is source of truth)
export const selectedConversationAtom = atom<string | null>(null);

export const newChatModelAtom = atom(
  (get) => get(clientStoreAtom).newChatModel,
  (get, set, value: string | null) => {
    set(clientStoreAtom, { ...get(clientStoreAtom), newChatModel: value });
  },
);
