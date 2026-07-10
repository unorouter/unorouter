import { jotaiCookieStorage } from "@/lib/config/table-storage";
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
  chatFontScale?: number;
  radius?: string;
  style?: string;
  iconLibrary?: string;
  menu?: string;
  menuAccent?: string;
  markdown?: ChatMarkdownColors;
  surface?: SurfaceTheme;
  surfaceMode?: "light" | "dark";
  background?: BackgroundSettings;
};

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
  // Client atom init reads the cookie synchronously; the server no longer
  // reads it at all (the layout ships a default-theme static shell).
  { getOnInit: true },
);

export const themeBackgroundAtom = atomWithStorage<string | null>(
  THEME_BG_KEY,
  null,
);
