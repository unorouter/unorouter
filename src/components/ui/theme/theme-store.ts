import { jotaiCookieStorage } from "@/lib/config/table-storage";
import { atomWithStorage } from "jotai/utils";

// Runtime theme: named registry refs only. UserThemeProvider resolves refs
// to css vars + data-attrs at render time.
export type ChatMarkdownColors = {
  normal?: string;
  italic?: string;
  bold?: string;
  italicBold?: string;
  singleQuote?: string;
  doubleQuote?: string;
};

// Freeform surface overrides. Win over the chosen base/accent presets in both
// light + dark (emitted late under `:root,.dark`).
export type SurfaceColors = {
  background?: string;
  foreground?: string;
  card?: string;
  primary?: string;
  accent?: string;
  border?: string;
  sidebar?: string;
};

export type BackgroundFit = "cover" | "contain" | "tile";

// Background-image knobs live in the cookie theme (small). The image bytes
// themselves ride a separate localStorage atom (data URLs blow the 4 KB cookie).
export type BackgroundSettings = {
  enabled?: boolean;
  opacity?: number; // 0..1
  blur?: number; // px
  fit?: BackgroundFit;
};

export type UserTheme = {
  baseColor?: string;
  theme?: string;
  chartColor?: string;
  fontBody?: string;
  fontHeading?: string;
  radius?: string;
  style?: string;
  iconLibrary?: string;
  menu?: string;
  menuAccent?: string;
  markdown?: ChatMarkdownColors;
  surface?: SurfaceColors;
  background?: BackgroundSettings;
};

export const USER_THEME_KEY = "user-theme";
export const THEME_BG_KEY = "user-theme-bg";

export const INITIAL_USER_THEME: UserTheme = {
  baseColor: "default",
  theme: "default",
  chartColor: "default",
  fontBody: "inherit",
  fontHeading: "inherit",
  radius: "none",
  style: "nova",
  iconLibrary: "lucide",
  menu: "default",
  menuAccent: "subtle",
  markdown: {},
};

export const userThemeAtom = atomWithStorage<UserTheme>(
  USER_THEME_KEY,
  INITIAL_USER_THEME,
  jotaiCookieStorage,
);

// localStorage (not cookies): a background-image data URL exceeds the 4 KB
// cookie limit. Local-only; not synced across devices.
export const themeBackgroundAtom = atomWithStorage<string | null>(
  THEME_BG_KEY,
  null,
);
