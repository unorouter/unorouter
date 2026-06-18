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
  sidebarOpen: boolean;
  expanded: Record<string, boolean>;
  debugLoggingEnabled: boolean;
};

export const INITIAL_CLIENT_STATE: ClientState = {
  apiKey: null,
  apiKeyRevealed: false,
  os: OS.WINDOWS,
  paymentMethod: "card",
  sidebarOpen: true,
  expanded: {},
  debugLoggingEnabled: false,
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
  (get) =>
    get(clientStoreAtom).paymentMethod ?? INITIAL_CLIENT_STATE.paymentMethod,
  (get, set, value: PaymentMethod) => {
    set(clientStoreAtom, { ...get(clientStoreAtom), paymentMethod: value });
  },
);

export const sidebarOpenAtom = atom(
  (get) => get(clientStoreAtom).sidebarOpen ?? INITIAL_CLIENT_STATE.sidebarOpen,
  (get, set, value: boolean) => {
    set(clientStoreAtom, { ...get(clientStoreAtom), sidebarOpen: value });
  },
);

export const debugLoggingEnabledAtom = atom(
  (get) =>
    get(clientStoreAtom).debugLoggingEnabled ??
    INITIAL_CLIENT_STATE.debugLoggingEnabled,
  (get, set, value: boolean) => {
    set(clientStoreAtom, { ...get(clientStoreAtom), debugLoggingEnabled: value });
  },
);

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
