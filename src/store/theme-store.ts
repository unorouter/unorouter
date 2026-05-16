import { jotaiCookieStorage } from "@/lib/config/table-storage";
import { atomWithStorage } from "jotai/utils";

/**
 * Per-user runtime theme. Every field is optional. Unset fields fall through
 * to the project defaults declared in `globals.css`. The picker UI writes
 * here; `UserThemeProvider` reads here and injects an inline `<style>` block
 * that overrides `--*` CSS variables. Cookie-persisted so SSR sees the
 * user's choices on first paint (no FOUC).
 */
export type UserTheme = {
  /** Token-level color overrides. Use any CSS color string (hex, oklch, hsl). */
  colors?: Partial<{
    primary: string;
    primaryForeground: string;
    accent: string;
    accentForeground: string;
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    muted: string;
    mutedForeground: string;
    border: string;
    ring: string;
    destructive: string;
    success: string;
    warning: string;
    info: string;
  }>;
  /**
   * Font family stack overrides. Picker picks a name from the curated list
   * in `theme-fonts.ts`; that module owns the actual `next/font/google`
   * imports. We only store the resolved CSS variable reference here, e.g.
   * "var(--font-inter), ui-sans-serif".
   */
  fonts?: Partial<{
    sans: string;
    mono: string;
    display: string;
  }>;
  /** Base font size in px. Default 16. */
  fontSize?: number;
  /** Unitless line height. Default 1.5. */
  lineHeight?: number;
  /** Letter spacing in em. Default 0. */
  letterSpacing?: number;
  /** Border radius in rem. Default whatever globals.css defines. */
  radius?: number;
  /**
   * Per-token chat bubble colors (italic / bold / code / quote). Applied by
   * the markdown renderer through tailwind utility classes that read these
   * vars.
   */
  chatTokens?: Partial<{
    plain: string;
    italic: string;
    bold: string;
    code: string;
    quote: string;
  }>;
};

export const USER_THEME_KEY = "user-theme";

export const INITIAL_USER_THEME: UserTheme = {};

export const userThemeAtom = atomWithStorage<UserTheme>(
  USER_THEME_KEY,
  INITIAL_USER_THEME,
  jotaiCookieStorage,
);
