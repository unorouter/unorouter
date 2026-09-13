import { USER_THEME_COOKIE } from "@/lib/config/constants";
import type {
  ScopeOverride,
  ThemeMode,
  ThemeScope,
  TokenDef,
} from "@/lib/theme/tokens";

export type TokenValues = Record<string, string | number>;
export type ModeValues = {
  all?: TokenValues;
  light?: TokenValues;
  dark?: TokenValues;
  // A scope may pick its own presets; the app's live in UserTheme.presets.
  presets?: ThemePresets;
};
export type ThemePresets = {
  palette?: string;
  accent?: string;
  chart?: string;
  style?: string;
};

// Layers, lowest first: globals.css, presets, global tokens, scope tokens.
export type UserTheme = {
  v: 2;
  presets: ThemePresets;
  global: ModeValues;
  scopes: Partial<Record<ScopeOverride, ModeValues>>;
};

export const USER_THEME_KEY = USER_THEME_COOKIE;

export const INITIAL_USER_THEME: UserTheme = {
  v: 2,
  presets: {
    palette: "default",
    accent: "default",
    chart: "default",
    style: "default",
  },
  global: {},
  scopes: {},
};

export const THEME_BG_KEYS: Record<ThemeScope, string> = {
  app: "user-theme-bg",
  chat: "user-theme-bg:chat",
  image: "user-theme-bg:image",
};

export type ThemeImages = Partial<Record<ThemeScope, string>>;

export function modeValues(theme: UserTheme, scope: ThemeScope): ModeValues {
  return scope === "app" ? theme.global : (theme.scopes[scope] ?? {});
}

export function presetsOf(theme: UserTheme, scope: ThemeScope): ThemePresets {
  return scope === "app" ? theme.presets : (theme.scopes[scope]?.presets ?? {});
}

export function writePresets(
  theme: UserTheme,
  scope: ThemeScope,
  presets: ThemePresets,
): UserTheme {
  if (scope === "app") return { ...theme, presets };
  return {
    ...theme,
    scopes: {
      ...theme.scopes,
      [scope]: { ...(theme.scopes[scope] ?? {}), presets },
    },
  };
}

type Slot = "all" | "light" | "dark";

function slot(def: TokenDef, mode: ThemeMode): Slot {
  return def.perMode ? mode : "all";
}

export function readToken(
  theme: UserTheme,
  scope: ThemeScope,
  mode: ThemeMode,
  def: TokenDef,
): string | number | undefined {
  return modeValues(theme, scope)[slot(def, mode)]?.[def.id];
}

export function writeToken(
  theme: UserTheme,
  scope: ThemeScope,
  mode: ThemeMode,
  def: TokenDef,
  value: string | number | undefined,
): UserTheme {
  const values = modeValues(theme, scope);
  const key = slot(def, mode);
  const next: TokenValues = { ...(values[key] ?? {}) };
  if (value === undefined) delete next[def.id];
  else next[def.id] = value;
  const nextValues: ModeValues = { ...values, [key]: next };
  if (Object.keys(next).length === 0) delete nextValues[key];
  if (scope === "app") return { ...theme, global: nextValues };
  const scopes = { ...theme.scopes, [scope]: nextValues };
  if (Object.keys(nextValues).length === 0) delete scopes[scope];
  return { ...theme, scopes };
}
