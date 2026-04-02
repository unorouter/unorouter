import { jotaiCookieStorage } from "@/lib/config/table-storage";
import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export type NavigationState = {
  sidebarOpen: boolean;
  expanded: Record<string, boolean>;
};

export const NAVIGATION_STORE_KEY = "navigation-store";

export const INITIAL_NAVIGATION_STATE: NavigationState = {
  sidebarOpen: true,
  expanded: {},
};

export const navigationAtom = atomWithStorage<NavigationState>(
  NAVIGATION_STORE_KEY,
  INITIAL_NAVIGATION_STATE,
  jotaiCookieStorage,
);

export const sidebarOpenAtom = atom(
  (get) => get(navigationAtom).sidebarOpen,
  (get, set, value: boolean) => {
    const state = get(navigationAtom);
    set(navigationAtom, {
      ...state,
      sidebarOpen: value,
    });
  },
);

export const toggleNavigationAtom = atom(null, (get, set, key: string) => {
  const state = get(navigationAtom);
  set(navigationAtom, {
    ...state,
    expanded: {
      ...state.expanded,
      [key]: !state.expanded[key],
    },
  });
});
