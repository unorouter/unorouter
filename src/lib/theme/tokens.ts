import type { IconLibraryName } from "@/lib/config/icon-map";
import type { useTranslations } from "next-intl";

// A key the typed translator accepts, so a typo in a registry fails tsc.
export type MessageKey = Parameters<
  ReturnType<typeof useTranslations<never>>
>[0];

export const THEME_SCOPES = ["app", "chat", "image"] as const;
export type ThemeScope = (typeof THEME_SCOPES)[number];
export type ScopeOverride = Exclude<ThemeScope, "app">;
export type ThemeMode = "light" | "dark";

export type TokenKind = "color" | "number" | "font" | "select";
export type TokenGroup =
  | "generator"
  | "surface"
  | "text"
  | "control"
  | "status"
  | "chart"
  | "sidebar"
  | "typography"
  | "shape"
  | "icons"
  | "menus"
  | "prose"
  | "wallpaper";

export type TokenDef = {
  id: string;
  // Absent for tokens that only feed a rule builder (wallpaper, menus).
  cssVar?: string;
  kind: TokenKind;
  group: TokenGroup;
  // Colours carry a light and a dark value; everything else one value.
  perMode: boolean;
  scopes: readonly ThemeScope[];
  labelKey: MessageKey;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  // What the app renders when the token is unset, shown greyed in the editor.
  defaultValue?: number;
  options?: readonly TokenOption[];
};

// Proper nouns (icon sets) carry a literal label; everything else translates.
export type TokenOption = {
  value: string;
  labelKey?: MessageKey;
  label?: string;
};

const ALL: readonly ThemeScope[] = THEME_SCOPES;
const CHAT: readonly ThemeScope[] = ["chat", "image"];

function color(
  id: string,
  group: TokenGroup,
  labelKey: MessageKey,
  scopes: readonly ThemeScope[] = ALL,
): TokenDef {
  return {
    id,
    cssVar: `--${id}`,
    kind: "color",
    group,
    perMode: true,
    scopes,
    labelKey,
  };
}

function number(
  id: string,
  group: TokenGroup,
  labelKey: MessageKey,
  range: {
    min: number;
    max: number;
    step: number;
    unit?: string;
    defaultValue: number;
  },
  scopes: readonly ThemeScope[] = ALL,
  cssVar?: string,
): TokenDef {
  return {
    id,
    cssVar,
    kind: "number",
    group,
    perMode: false,
    scopes,
    labelKey,
    ...range,
  };
}

function select(
  id: string,
  group: TokenGroup,
  labelKey: MessageKey,
  options: readonly TokenOption[],
  scopes: readonly ThemeScope[] = ALL,
): TokenDef {
  return {
    id,
    kind: "select",
    group,
    perMode: false,
    scopes,
    labelKey,
    options,
  };
}

const SHADOW_OPTIONS = [
  { value: "none", labelKey: "THEME.PRESET.SHADOW_NONE" },
  { value: "soft", labelKey: "THEME.PRESET.SHADOW_SOFT" },
  { value: "medium", labelKey: "THEME.PRESET.SHADOW_MEDIUM" },
  { value: "strong", labelKey: "THEME.PRESET.SHADOW_STRONG" },
] as const;

export const MENU_OPTIONS = [
  { value: "default", labelKey: "THEME.PRESET.MENU_DEFAULT" },
  { value: "inverted", labelKey: "THEME.PRESET.MENU_INVERTED" },
  {
    value: "default-translucent",
    labelKey: "THEME.PRESET.MENU_DEFAULT_TRANSLUCENT",
  },
  {
    value: "inverted-translucent",
    labelKey: "THEME.PRESET.MENU_INVERTED_TRANSLUCENT",
  },
] as const;

export const MENU_ACCENT_OPTIONS = [
  { value: "subtle", labelKey: "THEME.PRESET.ACCENT_SUBTLE" },
  { value: "bold", labelKey: "THEME.PRESET.ACCENT_BOLD" },
] as const;

export const ICON_LIBRARY_OPTIONS: readonly {
  value: IconLibraryName;
  label: string;
}[] = [
  { value: "lucide", label: "Lucide" },
  { value: "tabler", label: "Tabler Icons" },
  { value: "phosphor", label: "Phosphor" },
  { value: "heroicons", label: "Heroicons" },
  { value: "remix", label: "Remix Icon" },
  { value: "iconoir", label: "Iconoir" },
];

const FIT_OPTIONS = [
  { value: "cover", labelKey: "THEME.BG_FIT_COVER" },
  { value: "contain", labelKey: "THEME.BG_FIT_CONTAIN" },
  { value: "tile", labelKey: "THEME.BG_FIT_TILE" },
] as const;

export const AVATAR_OPTIONS = [
  { value: "1", labelKey: "THEME.AVATAR_SIZE_SMALL" },
  { value: "2", labelKey: "THEME.AVATAR_SIZE_MEDIUM" },
  { value: "3", labelKey: "THEME.AVATAR_SIZE_LARGE" },
] as const;

export const TOKENS: readonly TokenDef[] = [
  // Inputs to the palette generator. Only shown when a preset is "custom".
  color("palette-base", "generator", "THEME.PRESET.PALETTE"),
  color("accent-base", "generator", "THEME.PRESET.ACCENT"),
  color("chart-base", "generator", "THEME.PRESET.CHART"),

  color("background", "surface", "THEME.TOKEN.BACKGROUND"),
  color("card", "surface", "THEME.TOKEN.CARD"),
  color("popover", "surface", "THEME.TOKEN.POPOVER"),
  color("sidebar", "surface", "THEME.TOKEN.SIDEBAR"),

  color("foreground", "text", "THEME.TOKEN.FOREGROUND"),
  color("card-foreground", "text", "THEME.TOKEN.CARD_FOREGROUND"),
  color("popover-foreground", "text", "THEME.TOKEN.POPOVER_FOREGROUND"),
  color("muted-foreground", "text", "THEME.TOKEN.MUTED_FOREGROUND"),
  color("sidebar-foreground", "text", "THEME.TOKEN.SIDEBAR_FOREGROUND"),

  color("primary", "control", "THEME.TOKEN.PRIMARY"),
  color("primary-foreground", "control", "THEME.TOKEN.PRIMARY_FOREGROUND"),
  color("secondary", "control", "THEME.TOKEN.SECONDARY"),
  color("secondary-foreground", "control", "THEME.TOKEN.SECONDARY_FOREGROUND"),
  color("accent", "control", "THEME.TOKEN.ACCENT"),
  color("accent-foreground", "control", "THEME.TOKEN.ACCENT_FOREGROUND"),
  color("muted", "control", "THEME.TOKEN.MUTED"),
  color("border", "control", "THEME.TOKEN.BORDER"),
  color("input", "control", "THEME.TOKEN.INPUT"),
  color("ring", "control", "THEME.TOKEN.RING"),

  color("destructive", "status", "THEME.TOKEN.DESTRUCTIVE"),
  color("success", "status", "THEME.TOKEN.SUCCESS"),
  color("warning", "status", "THEME.TOKEN.WARNING"),
  color("info", "status", "THEME.TOKEN.INFO"),

  color("chart-1", "chart", "THEME.TOKEN.CHART_1"),
  color("chart-2", "chart", "THEME.TOKEN.CHART_2"),
  color("chart-3", "chart", "THEME.TOKEN.CHART_3"),
  color("chart-4", "chart", "THEME.TOKEN.CHART_4"),
  color("chart-5", "chart", "THEME.TOKEN.CHART_5"),

  color("sidebar-primary", "sidebar", "THEME.TOKEN.SIDEBAR_PRIMARY"),
  color(
    "sidebar-primary-foreground",
    "sidebar",
    "THEME.TOKEN.SIDEBAR_PRIMARY_FOREGROUND",
  ),
  color("sidebar-accent", "sidebar", "THEME.TOKEN.SIDEBAR_ACCENT"),
  color(
    "sidebar-accent-foreground",
    "sidebar",
    "THEME.TOKEN.SIDEBAR_ACCENT_FOREGROUND",
  ),
  color("sidebar-border", "sidebar", "THEME.TOKEN.SIDEBAR_BORDER"),
  color("sidebar-ring", "sidebar", "THEME.TOKEN.SIDEBAR_RING"),

  {
    id: "font-sans",
    cssVar: "--font-sans",
    kind: "font",
    group: "typography",
    perMode: false,
    scopes: ALL,
    labelKey: "THEME.BODY_FONT",
  },
  {
    id: "font-display",
    cssVar: "--font-display",
    kind: "font",
    group: "typography",
    perMode: false,
    scopes: ALL,
    labelKey: "THEME.HEADING_FONT",
  },
  {
    id: "font-mono",
    cssVar: "--font-mono",
    kind: "font",
    group: "typography",
    perMode: false,
    scopes: ALL,
    labelKey: "THEME.MONO_FONT",
  },
  // Root font size: rem-based layout scales with it, so this is the whole app.
  number(
    "font-scale",
    "typography",
    "THEME.TOKEN.FONT_SCALE",
    { min: 0.8, max: 1.3, step: 0.05, defaultValue: 1, unit: "x" },
    ["app"],
    "--font-scale",
  ),
  // Message text only, since rem-based utilities ignore an ancestor font-size.
  number(
    "prose-scale",
    "typography",
    "THEME.CHAT_FONT_SIZE",
    { min: 0.8, max: 1.6, step: 0.05, defaultValue: 1, unit: "x" },
    CHAT,
    "--prose-scale",
  ),
  number(
    "font-weight",
    "typography",
    "THEME.TEXT_WEIGHT",
    { min: 400, max: 700, step: 100, defaultValue: 400 },
    ALL,
    "--font-weight",
  ),
  number(
    "tracking",
    "typography",
    "THEME.LETTER_SPACING",
    { min: -0.05, max: 0.1, step: 0.005, defaultValue: 0, unit: "em" },
    ALL,
    "--tracking",
  ),

  number(
    "radius",
    "shape",
    "THEME.RADIUS",
    { min: 0, max: 2, step: 0.05, defaultValue: 0, unit: "rem" },
    ALL,
    "--radius",
  ),
  number(
    "spacing",
    "shape",
    "THEME.TOKEN.SPACING",
    { min: 0.18, max: 0.34, step: 0.01, defaultValue: 0.25, unit: "rem" },
    ALL,
    "--spacing",
  ),
  select("shadow", "shape", "THEME.TOKEN.SHADOW", SHADOW_OPTIONS),

  select("icon-library", "icons", "THEME.ICON_LIBRARY", ICON_LIBRARY_OPTIONS, [
    "app",
  ]),
  select("menu", "menus", "THEME.MENU", MENU_OPTIONS, ["app"]),
  select("menu-accent", "menus", "THEME.MENU_ACCENT", MENU_ACCENT_OPTIONS, [
    "app",
  ]),

  color("md-normal", "prose", "THEME.MD_NORMAL", CHAT),
  color("md-italic", "prose", "THEME.MD_ITALIC", CHAT),
  color("md-bold", "prose", "THEME.MD_BOLD", CHAT),
  color("md-italic-bold", "prose", "THEME.MD_ITALIC_BOLD", CHAT),
  color("md-single-quote", "prose", "THEME.MD_SINGLE_QUOTE", CHAT),
  color("md-double-quote", "prose", "THEME.MD_DOUBLE_QUOTE", CHAT),
  {
    ...select(
      "chat-avatar",
      "prose",
      "THEME.AVATAR_SCALE",
      AVATAR_OPTIONS,
      CHAT,
    ),
    cssVar: "--chat-avatar",
  },
  number(
    "asset-img-max-width",
    "prose",
    "THEME.ASSET_IMAGE_WIDTH",
    { min: 4, max: 40, step: 1, defaultValue: 20, unit: "rem" },
    CHAT,
    "--asset-img-max-width",
  ),

  select("wallpaper-fit", "wallpaper", "THEME.BG_FIT", FIT_OPTIONS),
  number("wallpaper-opacity", "wallpaper", "THEME.BG_OPACITY", {
    min: 0.1,
    max: 1,
    step: 0.05,
    defaultValue: 1,
    unit: "%",
  }),
  number("wallpaper-blur", "wallpaper", "THEME.BG_BLUR", {
    min: 0,
    max: 24,
    step: 1,
    defaultValue: 0,
    unit: "px",
  }),
  number("panel-opacity", "wallpaper", "THEME.BG_PANEL_OPACITY", {
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0.75,
    unit: "%",
  }),
  number("panel-blur", "wallpaper", "THEME.BG_PANEL_BLUR", {
    min: 0,
    max: 24,
    step: 1,
    defaultValue: 8,
    unit: "px",
  }),
  number(
    "bubble-opacity",
    "wallpaper",
    "THEME.BG_BUBBLE_OPACITY",
    { min: 0, max: 1, step: 0.05, defaultValue: 0.75, unit: "%" },
    CHAT,
  ),
  number(
    "composer-opacity",
    "wallpaper",
    "THEME.BG_COMPOSER_OPACITY",
    { min: 0, max: 1, step: 0.05, defaultValue: 0.75, unit: "%" },
    ["chat"],
  ),
];

export const TOKEN_BY_ID: ReadonlyMap<string, TokenDef> = new Map(
  TOKENS.map((t) => [t.id, t]),
);

export function tokensIn(
  group: TokenGroup,
  scope: ThemeScope,
): readonly TokenDef[] {
  return TOKENS.filter((t) => t.group === group && t.scopes.includes(scope));
}
