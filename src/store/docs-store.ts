import { jotaiCookieStorage } from "@/lib/config/table-storage";
import { OS } from "@/lib/types/enums";
import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export type DocsState = {
  apiKey: string | null;
  apiKeyRevealed: boolean;
  os: OS | undefined;
};

export const DOCS_STORE_KEY = "docs-store";

export const INITIAL_DOCS_STATE: DocsState = {
  apiKey: null,
  apiKeyRevealed: false,
  os: OS.WINDOWS,
};

export const docsStoreAtom = atomWithStorage<DocsState>(
  DOCS_STORE_KEY,
  INITIAL_DOCS_STATE,
  jotaiCookieStorage,
);

export const apiKeyAtom = atom(
  (get) => get(docsStoreAtom).apiKey,
  (get, set, value: string | null) => {
    set(docsStoreAtom, { ...get(docsStoreAtom), apiKey: value });
  },
);

export const apiKeyRevealedAtom = atom(
  (get) => get(docsStoreAtom).apiKeyRevealed,
  (get, set, value: boolean) => {
    set(docsStoreAtom, { ...get(docsStoreAtom), apiKeyRevealed: value });
  },
);

export function obfuscateApiKey(key: string) {
  const prefix = key.slice(0, 6);
  const suffix = key.slice(-3);
  return `${prefix}...${suffix}`;
}

export const osAtom = atom(
  (get) => get(docsStoreAtom).os,
  (get, set, value: OS | undefined) => {
    set(docsStoreAtom, { ...get(docsStoreAtom), os: value });
  },
);
