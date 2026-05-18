import { jotaiCookieStorage } from "@/lib/config/table-storage";
import { atomWithStorage } from "jotai/utils";

// Runtime theme: named registry refs only. UserThemeProvider resolves refs
// to css vars + data-attrs at render time.
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
};

export const USER_THEME_KEY = "user-theme";

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
};

export const userThemeAtom = atomWithStorage<UserTheme>(
  USER_THEME_KEY,
  INITIAL_USER_THEME,
  jotaiCookieStorage,
);
