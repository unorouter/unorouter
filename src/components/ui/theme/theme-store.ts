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

// Freeform surface overrides for ONE color scheme. Win over the chosen
// base/accent presets (emitted late, per scheme).
export type SurfaceColors = {
  background?: string;
  foreground?: string;
  card?: string;
  primary?: string;
  accent?: string;
  border?: string;
  sidebar?: string;
};

// Per-scheme custom palette (RisuAI parity: a custom theme declares light vs
// dark values independently instead of one override hitting both schemes).
export type SurfaceTheme = {
  light?: SurfaceColors;
  dark?: SurfaceColors;
};

export type BackgroundFit = "cover" | "contain" | "tile";

// Background-image knobs live in the cookie theme (small). The image bytes
// themselves ride a separate localStorage atom (data URLs blow the 4 KB cookie).
export type BackgroundSettings = {
  enabled?: boolean;
  opacity?: number; // 0..1
  blur?: number; // px
  fit?: BackgroundFit;
  panelOpacity?: number; // 0..1, surface translucency so the image floats behind panels
};

export type UserTheme = {
  baseColor?: string;
  // Custom hex used when baseColor === "custom" (drives --background + derived
  // --foreground). Same pattern for themeCustom (--primary) and chartColorCustom
  // (--chart-1..5 generated from the hue).
  baseColorCustom?: string;
  theme?: string;
  themeCustom?: string;
  chartColor?: string;
  chartColorCustom?: string;
  fontBody?: string;
  fontHeading?: string;
  radius?: string;
  style?: string;
  iconLibrary?: string;
  menu?: string;
  menuAccent?: string;
  markdown?: ChatMarkdownColors;
  // Per-scheme custom surface colors. Legacy flat SurfaceColors is migrated to
  // { light, dark } (same values both modes) by normalizeSurface at read time.
  surface?: SurfaceTheme;
  // Which scheme the customizer is editing; persisted so the toggle sticks.
  surfaceMode?: "light" | "dark";
  background?: BackgroundSettings;
};

// Back-compat: an old flat surface object (pre per-scheme split) applied to both
// schemes. Normalize it to the new shape so existing themes keep working.
export function normalizeSurface(
  surface: UserTheme["surface"] | SurfaceColors | undefined,
): SurfaceTheme {
  if (!surface) return {};
  if ("light" in surface || "dark" in surface) return surface as SurfaceTheme;
  const flat = surface as SurfaceColors;
  return { light: flat, dark: flat };
}

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
  surfaceMode: "dark",
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
