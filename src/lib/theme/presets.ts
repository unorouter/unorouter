// Presets are INPUTS: a palette is a base colour per mode, an accent is one hue
// per mode, a style is a handful of shape tokens. `resolveTokens` in
// build-css.ts turns them into variables through the same generator that
// serves the custom colour fields.

export type ModeHex = { light: string; dark: string };

export type PalettePreset = {
  id: string;
  label: string;
  base: ModeHex;
  accent?: ModeHex;
};

export const PALETTES: readonly PalettePreset[] = [
  {
    id: "neutral",
    label: "Neutral",
    base: { light: "#ffffff", dark: "#171717" },
  },
  { id: "stone", label: "Stone", base: { light: "#fafaf9", dark: "#1c1917" } },
  { id: "zinc", label: "Zinc", base: { light: "#fafafa", dark: "#18181b" } },
  { id: "mauve", label: "Mauve", base: { light: "#fbf9fc", dark: "#1c1722" } },
  { id: "olive", label: "Olive", base: { light: "#fafbf7", dark: "#1a1c17" } },
  { id: "mist", label: "Mist", base: { light: "#f8fafc", dark: "#161a1f" } },
  { id: "taupe", label: "Taupe", base: { light: "#faf8f6", dark: "#1e1a18" } },
  {
    id: "sakura",
    label: "Sakura",
    base: { light: "#fbf1f5", dark: "#2b1c25" },
    accent: { light: "#e48bb5", dark: "#efa7c6" },
  },
];

export type AccentPreset = { id: string; label: string; hex: ModeHex };

export const ACCENTS: readonly AccentPreset[] = [
  { id: "amber", label: "Amber", hex: { light: "#d97706", dark: "#f59e0b" } },
  { id: "blue", label: "Blue", hex: { light: "#2563eb", dark: "#3b82f6" } },
  { id: "cyan", label: "Cyan", hex: { light: "#0891b2", dark: "#06b6d4" } },
  {
    id: "emerald",
    label: "Emerald",
    hex: { light: "#059669", dark: "#10b981" },
  },
  {
    id: "fuchsia",
    label: "Fuchsia",
    hex: { light: "#c026d3", dark: "#d946ef" },
  },
  { id: "green", label: "Green", hex: { light: "#16a34a", dark: "#22c55e" } },
  { id: "indigo", label: "Indigo", hex: { light: "#4f46e5", dark: "#6366f1" } },
  { id: "lime", label: "Lime", hex: { light: "#65a30d", dark: "#84cc16" } },
  { id: "orange", label: "Orange", hex: { light: "#ea580c", dark: "#f97316" } },
  { id: "pink", label: "Pink", hex: { light: "#db2777", dark: "#ec4899" } },
  { id: "purple", label: "Purple", hex: { light: "#9333ea", dark: "#a855f7" } },
  { id: "red", label: "Red", hex: { light: "#dc2626", dark: "#ef4444" } },
  { id: "rose", label: "Rose", hex: { light: "#e11d48", dark: "#f43f5e" } },
  { id: "sky", label: "Sky", hex: { light: "#0284c7", dark: "#0ea5e9" } },
  { id: "teal", label: "Teal", hex: { light: "#0d9488", dark: "#14b8a6" } },
  { id: "violet", label: "Violet", hex: { light: "#7c3aed", dark: "#8b5cf6" } },
  { id: "yellow", label: "Yellow", hex: { light: "#ca8a04", dark: "#eab308" } },
  {
    id: "bubblegum",
    label: "Bubblegum",
    hex: { light: "#e879a8", dark: "#f4a3c8" },
  },
];

export type StylePreset = {
  id: string;
  label: string;
  radius: number; // rem
  spacing: number; // rem, Tailwind's base unit
  shadow: "none" | "soft" | "medium" | "strong";
  tracking: number; // em
};

export const STYLES: readonly StylePreset[] = [
  {
    id: "vega",
    label: "Vega",
    radius: 0.375,
    spacing: 0.22,
    shadow: "none",
    tracking: 0,
  },
  {
    id: "nova",
    label: "Nova",
    radius: 0.625,
    spacing: 0.25,
    shadow: "soft",
    tracking: 0,
  },
  {
    id: "maia",
    label: "Maia",
    radius: 0.875,
    spacing: 0.28,
    shadow: "medium",
    tracking: 0.01,
  },
  {
    id: "lyra",
    label: "Lyra",
    radius: 0,
    spacing: 0.25,
    shadow: "none",
    tracking: 0.02,
  },
  {
    id: "mira",
    label: "Mira",
    radius: 1.25,
    spacing: 0.27,
    shadow: "strong",
    tracking: 0,
  },
  {
    id: "luma",
    label: "Luma",
    radius: 1,
    spacing: 0.3,
    shadow: "medium",
    tracking: -0.01,
  },
  {
    id: "sera",
    label: "Sera",
    radius: 0.25,
    spacing: 0.24,
    shadow: "soft",
    tracking: 0.015,
  },
];

export const SHADOWS: Record<StylePreset["shadow"], string> = {
  none: "0 0 #0000",
  soft: "0 1px 3px rgb(0 0 0 / 0.1)",
  medium: "0 4px 12px rgb(0 0 0 / 0.1)",
  strong: "0 8px 24px rgb(0 0 0 / 0.14)",
};

export const RADIUS_CHOICES = [0, 0.375, 0.625, 0.875, 1.25] as const;

export const CUSTOM = "custom";
export const DEFAULT = "default";

export function findPalette(id: string | undefined): PalettePreset | null {
  return PALETTES.find((p) => p.id === id) ?? null;
}

export function findAccent(id: string | undefined): AccentPreset | null {
  return ACCENTS.find((a) => a.id === id) ?? null;
}

export function findStyle(id: string | undefined): StylePreset | null {
  return STYLES.find((s) => s.id === id) ?? null;
}
