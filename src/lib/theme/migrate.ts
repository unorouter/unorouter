import { normHex } from "@/lib/theme/palette";
import { CUSTOM, DEFAULT } from "@/lib/theme/presets";
import {
  INITIAL_USER_THEME,
  type ModeValues,
  type TokenValues,
  type UserTheme,
} from "@/lib/theme/theme-types";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v ? v : undefined;
}

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function tokenValues(v: unknown): TokenValues | undefined {
  if (!isRecord(v)) return undefined;
  const out: TokenValues = {};
  for (const [k, val] of Object.entries(v)) {
    if (typeof val === "string" || typeof val === "number") out[k] = val;
  }
  return Object.keys(out).length ? out : undefined;
}

function modeValues(v: unknown): ModeValues {
  if (!isRecord(v)) return {};
  const out: ModeValues = {};
  const all = tokenValues(v.all);
  const light = tokenValues(v.light);
  const dark = tokenValues(v.dark);
  if (all) out.all = all;
  if (light) out.light = light;
  if (dark) out.dark = dark;
  return out;
}

// "none" was v1's default for everyone, so it stays unset and lets a Style
// preset supply the radius.
const V1_RADIUS: Record<string, number> = {
  small: 0.45,
  medium: 0.625,
  large: 0.875,
};

// v1 surface fields fanned out to sibling variables inside the builder; the
// fan-out is now explicit so the migrated theme renders the same.
const V1_SURFACE_ALIASES: Record<string, readonly string[]> = {
  card: ["card", "popover"],
  primary: ["primary", "ring"],
  border: ["border", "input"],
};

function v1Surface(v: unknown): ModeValues {
  if (!isRecord(v)) return {};
  const perMode = "light" in v || "dark" in v;
  const convert = (colors: unknown): TokenValues | undefined => {
    if (!isRecord(colors)) return undefined;
    const out: TokenValues = {};
    for (const [k, val] of Object.entries(colors)) {
      const hex = normHex(str(val));
      if (!hex) continue;
      for (const id of V1_SURFACE_ALIASES[k] ?? [k]) out[id] = hex;
    }
    return Object.keys(out).length ? out : undefined;
  };
  const light = convert(perMode ? v.light : v);
  const dark = convert(perMode ? v.dark : v);
  const out: ModeValues = {};
  if (light) out.light = light;
  if (dark) out.dark = dark;
  return out;
}

function v1Font(id: unknown, custom: unknown): string | undefined {
  const s = str(id);
  if (!s || s === "inherit") return undefined;
  if (s === CUSTOM) {
    const name = str(custom);
    return name ? `${CUSTOM}:${name}` : undefined;
  }
  return s;
}

function bothModes(values: ModeValues, id: string, hex: string): void {
  values.light = { ...(values.light ?? {}), [id]: hex };
  values.dark = { ...(values.dark ?? {}), [id]: hex };
}

function fromV1(raw: Record<string, unknown>): UserTheme {
  const global: ModeValues = v1Surface(raw.surface);
  const chat: ModeValues = v1Surface(raw.chatSurface);
  const all: TokenValues = {};
  const chatAll: TokenValues = {};
  const presets = { ...INITIAL_USER_THEME.presets };

  const base = str(raw.baseColor);
  if (base === CUSTOM) {
    const hex = normHex(str(raw.baseColorCustom));
    if (hex) {
      presets.palette = CUSTOM;
      bothModes(global, "palette-base", hex);
    }
  } else if (base && base !== DEFAULT) presets.palette = base;

  const accent = str(raw.theme);
  if (accent === CUSTOM) {
    const hex = normHex(str(raw.themeCustom));
    if (hex) {
      presets.accent = CUSTOM;
      bothModes(global, "accent-base", hex);
    }
  } else if (accent === "sakura") presets.palette = "sakura";
  else if (accent && accent !== DEFAULT) presets.accent = accent;

  const chart = str(raw.chartColor);
  if (chart === CUSTOM) {
    const hex = normHex(str(raw.chartColorCustom));
    if (hex) {
      presets.chart = CUSTOM;
      bothModes(global, "chart-base", hex);
    }
  } else if (chart === "sakura") presets.chart = "bubblegum";
  else if (chart && chart !== DEFAULT) presets.chart = chart;

  // Nova was the inert default: it multiplied a radius of zero.
  const style = str(raw.style);
  if (style && style !== "nova") presets.style = style;

  const radius = V1_RADIUS[str(raw.radius) ?? ""];
  if (radius !== undefined) all.radius = radius;

  const sans = v1Font(raw.fontBody, raw.fontBodyCustom);
  if (sans) all["font-sans"] = sans;
  const display = v1Font(raw.fontHeading, raw.fontHeadingCustom);
  if (display) all["font-display"] = display;
  const mono = v1Font(raw.fontMono, undefined);
  if (mono) all["font-mono"] = mono;

  const icons = str(raw.iconLibrary);
  if (icons && icons !== "lucide") all["icon-library"] = icons;

  if (isRecord(raw.markdown)) {
    const ids: Record<string, string> = {
      normal: "md-normal",
      italic: "md-italic",
      bold: "md-bold",
      italicBold: "md-italic-bold",
      singleQuote: "md-single-quote",
      doubleQuote: "md-double-quote",
    };
    for (const [k, id] of Object.entries(ids)) {
      const hex = normHex(str(raw.markdown[k]));
      if (hex) bothModes(chat, id, hex);
    }
  }

  const scale = num(raw.chatFontScale);
  if (scale && scale !== 1) chatAll["prose-scale"] = scale;
  const weight = num(raw.chatFontWeight);
  if (weight && weight !== 400) chatAll["font-weight"] = weight;
  const avatar = num(raw.chatAvatarScale);
  if (avatar && avatar !== 1) chatAll["chat-avatar"] = String(avatar);
  const assetWidth = num(raw.assetImageMaxWidth);
  if (assetWidth) chatAll["asset-img-max-width"] = assetWidth;

  if (isRecord(raw.background)) {
    const bg = raw.background;
    const fit = str(bg.fit);
    if (fit && fit !== "cover") all["wallpaper-fit"] = fit;
    const opacity = num(bg.opacity);
    if (opacity !== undefined && opacity !== 1)
      all["wallpaper-opacity"] = opacity;
    const blur = num(bg.blur);
    if (blur) all["wallpaper-blur"] = blur;
    const panelOpacity = num(bg.panelOpacity);
    if (panelOpacity !== undefined) all["panel-opacity"] = panelOpacity;
    const panelBlur = num(bg.panelBlur);
    if (panelBlur !== undefined) all["panel-blur"] = panelBlur;
    const bubble = num(bg.bubbleOpacity);
    if (bubble !== undefined) chatAll["bubble-opacity"] = bubble;
    const composer = num(bg.composerOpacity);
    if (composer !== undefined) chatAll["composer-opacity"] = composer;
  }

  if (Object.keys(all).length) global.all = all;
  if (Object.keys(chatAll).length) chat.all = chatAll;
  const scopes: UserTheme["scopes"] = {};
  if (Object.keys(chat).length) scopes.chat = chat;
  return { v: 2, presets, global, scopes };
}

export function migrateTheme(raw: unknown): UserTheme {
  if (!isRecord(raw)) return INITIAL_USER_THEME;
  if (raw.v !== 2) return fromV1(raw);
  const presets = isRecord(raw.presets) ? raw.presets : {};
  const scopesRaw = isRecord(raw.scopes) ? raw.scopes : {};
  const scopes: UserTheme["scopes"] = {};
  for (const key of ["chat", "image"] as const) {
    const values = modeValues(scopesRaw[key]);
    if (Object.keys(values).length) scopes[key] = values;
  }
  return {
    v: 2,
    presets: {
      palette: str(presets.palette) ?? DEFAULT,
      accent: str(presets.accent) ?? DEFAULT,
      chart: str(presets.chart) ?? DEFAULT,
      style: str(presets.style) ?? DEFAULT,
    },
    global: modeValues(raw.global),
    scopes,
  };
}
