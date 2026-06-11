import { jotaiCookieStorage } from "@/lib/config/table-storage";
import { OS } from "@/lib/types/enums";
import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export const CLIENT_STORE_KEY = "client-store";

export type PaymentMethod = "card" | "crypto";

export type ClientState = {
  apiKey: string | null;
  apiKeyRevealed: boolean;
  os: OS | undefined;
  paymentMethod: PaymentMethod;
};

export const INITIAL_CLIENT_STATE: ClientState = {
  apiKey: null,
  apiKeyRevealed: false,
  os: OS.WINDOWS,
  paymentMethod: "card",
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

export const paymentMethodAtom = atom(
  // Cookies written before the field existed lack it; fall back per field.
  (get) => get(clientStoreAtom).paymentMethod ?? INITIAL_CLIENT_STATE.paymentMethod,
  (get, set, value: PaymentMethod) => {
    set(clientStoreAtom, { ...get(clientStoreAtom), paymentMethod: value });
  },
);
