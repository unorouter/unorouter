import { jotaiCookieStorage } from "@/lib/config/table-storage";
import type { IconLibraryName } from "@/lib/config/icon-map";
import { atomWithStorage } from "jotai/utils";

export type ChatMarkdownColors = {
  normal?: string;
  italic?: string;
  bold?: string;
  italicBold?: string;
  singleQuote?: string;
  doubleQuote?: string;
};

export type SurfaceColors = {
  background?: string;
  foreground?: string;
  card?: string;
  primary?: string;
  accent?: string;
  // Backs chips, the unfilled half of every slider track, skeletons and hover
  // states. Previously only settable via the base-colour preset, so a user who
  // themed everything still had grey chips they could not find a control for.
  muted?: string;
  border?: string;
  sidebar?: string;
};

export type SurfaceTheme = {
  light?: SurfaceColors;
  dark?: SurfaceColors;
};

export type BackgroundFit = "cover" | "contain" | "tile";

export type BackgroundSettings = {
  enabled?: boolean;
  opacity?: number; // 0..1
  blur?: number; // px
  fit?: BackgroundFit;
  panelOpacity?: number; // 0..1, surface translucency so the image floats behind panels
  // Message bubbles sit ON a panel rather than beside one, so the panel value
  // reads differently on them: what frames a sidebar nicely leaves a bubble
  // looking like it overlaps the artwork. Defaults to panelOpacity.
  bubbleOpacity?: number; // 0..1
};

export type UserTheme = {
  baseColor?: string;
  baseColorCustom?: string;
  theme?: string;
  themeCustom?: string;
  chartColor?: string;
  chartColorCustom?: string;
  fontBody?: string;
  fontHeading?: string;
  fontMono?: string;
  chatFontScale?: number;
  assetImageMaxWidth?: number; // rem; caps {{img::name}} asset image width
  radius?: string;
  style?: string;
  iconLibrary?: IconLibraryName;
  menu?: string;
  menuAccent?: string;
  markdown?: ChatMarkdownColors;
  surface?: SurfaceTheme;
  // Absent means the chat inherits `surface`. A palette tuned for reading long
  // RP is unreadable on the model table, so the two surfaces are separable.
  chatSurface?: SurfaceTheme;
  surfaceMode?: "light" | "dark";
  surfaceScope?: SurfaceScope;
  background?: BackgroundSettings;
};

export type SurfaceScope = "app" | "chat";

function isSurfaceTheme(
  surface: SurfaceTheme | SurfaceColors,
): surface is SurfaceTheme {
  return "light" in surface || "dark" in surface;
}

export function normalizeSurface(
  surface: SurfaceTheme | SurfaceColors | undefined,
): SurfaceTheme {
  if (!surface) return {};
  if (isSurfaceTheme(surface)) return surface;
  return { light: surface, dark: surface };
}

export const USER_THEME_KEY = "user-theme";
export const THEME_BG_KEY = "user-theme-bg";

export const INITIAL_USER_THEME: UserTheme = {
  baseColor: "default",
  theme: "default",
  chartColor: "default",
  fontBody: "inherit",
  fontHeading: "inherit",
  fontMono: "inherit",
  radius: "none",
  style: "nova",
  iconLibrary: "lucide",
  menu: "default",
  menuAccent: "subtle",
  markdown: {},
  surfaceMode: "dark",
};

export const userThemeAtom = atomWithStorage<UserTheme>(
  USER_THEME_KEY,
  INITIAL_USER_THEME,
  jotaiCookieStorage,
);

export const themeBackgroundAtom = atomWithStorage<string | null>(
  THEME_BG_KEY,
  null,
);
