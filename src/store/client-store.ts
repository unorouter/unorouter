import { jotaiCookieStorage } from "@/lib/config/table-storage";
import { OS } from "@/lib/types/enums";
import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export const CLIENT_STORE_KEY = "client-store";

export type ClientState = {
  apiKeyRevealed: boolean;
  os: OS | undefined;
  selectedConversation: string | null;
  newChatModel: string | null;
};

export const INITIAL_CLIENT_STATE: ClientState = {
  apiKeyRevealed: false,
  os: OS.WINDOWS,
  selectedConversation: null,
  newChatModel: null,
};

export const clientStoreAtom = atomWithStorage<ClientState>(
  CLIENT_STORE_KEY,
  INITIAL_CLIENT_STATE,
  jotaiCookieStorage,
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

// Chat atoms (derived from cookie-persisted store)
export const selectedConversationAtom = atom(
  (get) => get(clientStoreAtom).selectedConversation,
  (get, set, value: string | null) => {
    set(clientStoreAtom, {
      ...get(clientStoreAtom),
      selectedConversation: value,
    });
  },
);

export const newChatModelAtom = atom(
  (get) => get(clientStoreAtom).newChatModel,
  (get, set, value: string | null) => {
    set(clientStoreAtom, { ...get(clientStoreAtom), newChatModel: value });
  },
);
