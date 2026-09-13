import { jotaiCookieStorage } from "@/lib/config/table-storage";
import { migrateTheme } from "@/lib/theme/migrate";
import {
  INITIAL_USER_THEME,
  THEME_BG_KEYS,
  USER_THEME_KEY,
  type UserTheme,
} from "@/lib/theme/theme-types";
import type { ThemeMode, ThemeScope } from "@/lib/theme/tokens";
import { atomWithStorage } from "jotai/utils";

const themeCookieStorage = {
  getItem: (key: string, initial: UserTheme): UserTheme =>
    migrateTheme(jotaiCookieStorage.getItem<unknown>(key, initial)),
  setItem: jotaiCookieStorage.setItem,
  removeItem: jotaiCookieStorage.removeItem,
};

// getOnInit is a load-bearing PAIR with UserThemeStoreProvider; neither may be
// removed alone. See CLAUDE.md "State".
export const userThemeAtom = atomWithStorage<UserTheme>(
  USER_THEME_KEY,
  INITIAL_USER_THEME,
  themeCookieStorage,
  { getOnInit: true },
);

export const themeBackgroundAtoms = {
  app: atomWithStorage<string | null>(THEME_BG_KEYS.app, null),
  chat: atomWithStorage<string | null>(THEME_BG_KEYS.chat, null),
  image: atomWithStorage<string | null>(THEME_BG_KEYS.image, null),
} satisfies Record<ThemeScope, unknown>;

export type ThemeEditorState = {
  scope: ThemeScope;
  mode: ThemeMode;
  section: string;
};

// Where the editor was left, never part of the theme itself.
export const themeEditorAtom = atomWithStorage<ThemeEditorState>(
  "theme-editor",
  { scope: "app", mode: "dark", section: "presets" },
);
