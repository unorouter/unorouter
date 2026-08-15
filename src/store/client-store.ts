import { jotaiCookieStorage } from "@/lib/config/table-storage";
import { OS } from "@/lib/types/enums";
import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export const CLIENT_STORE_KEY = "client-store";

export type PaymentMethod = "card" | "crypto" | "paypal";

export type ClientState = {
  apiKey: string | null;
  apiKeyRevealed: boolean;
  os: OS | undefined;
  paymentMethod: PaymentMethod;
  sidebarOpen: boolean;
  expanded: Record<string, boolean>;
};

export const INITIAL_CLIENT_STATE: ClientState = {
  apiKey: null,
  apiKeyRevealed: false,
  os: OS.WINDOWS,
  paymentMethod: "card",
  sidebarOpen: true,
  expanded: {},
};

export const clientStoreAtom = atomWithStorage<ClientState>(
  CLIENT_STORE_KEY,
  INITIAL_CLIENT_STATE,
  jotaiCookieStorage,
);

function field<K extends keyof ClientState>(key: K) {
  return atom(
    (get) => get(clientStoreAtom)[key] ?? INITIAL_CLIENT_STATE[key],
    (get, set, value: ClientState[K]) => {
      set(clientStoreAtom, { ...get(clientStoreAtom), [key]: value });
    },
  );
}

export const apiKeyAtom = field("apiKey");
export const apiKeyRevealedAtom = field("apiKeyRevealed");
export const osAtom = field("os");
export const paymentMethodAtom = field("paymentMethod");
export const sidebarOpenAtom = field("sidebarOpen");

export function obfuscateApiKey(key: string) {
  const prefix = key.slice(0, 6);
  const suffix = key.slice(-3);
  return `${prefix}...${suffix}`;
}

export const expandedNavAtom = atom(
  (get) => get(clientStoreAtom).expanded ?? INITIAL_CLIENT_STATE.expanded,
);

export const toggleNavigationAtom = atom(null, (get, set, key: string) => {
  const state = get(clientStoreAtom);
  const expanded = state.expanded ?? INITIAL_CLIENT_STATE.expanded;
  set(clientStoreAtom, {
    ...state,
    expanded: { ...expanded, [key]: !expanded[key] },
  });
});
