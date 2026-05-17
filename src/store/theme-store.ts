import { jotaiCookieStorage } from "@/lib/config/table-storage";
import { atomWithStorage } from "jotai/utils";

/**
 * Runtime theme: named registry refs only. No per-token mixing. Each picker
 * points at a curated entry in shadcn-themes/shadcn-styles/icon-map.
 * UserThemeProvider resolves refs to css vars + data-attrs at render time.
 */
export type UserTheme = {
  baseColor?: string;
  theme?: string;
  chartColor?: string;
  fontBody?: string;
  fontHeading?: string;
  radius?: string;
  /** Component style preset (vega|nova|maia|lyra|mira|luma|sera). */
  style?: string;
  /** Icon library id (lucide|tabler). */
  iconLibrary?: string;
  /** Dropdown/popover/sheet surface mode. */
  menu?: string;
  /** Menu item hover/active accent (subtle|bold). */
  menuAccent?: string;
};

export const USER_THEME_KEY = "user-theme";

export const INITIAL_USER_THEME: UserTheme = {
  baseColor: "neutral",
  theme: "neutral",
  chartColor: "neutral",
  fontBody: "inter",
  fontHeading: "inherit",
  radius: "default",
  style: "nova",
  iconLibrary: "lucide",
  menu: "default",
  menuAccent: "subtle",
};

export const userThemeAtom = atomWithStorage<UserTheme>(
  USER_THEME_KEY,
  INITIAL_USER_THEME,
  jotaiCookieStorage,
);
