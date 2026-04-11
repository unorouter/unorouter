// ── Theme ──────────────────────────────────────────────────

export type Theme = "dark" | "light" | "auto";

export interface ThemeColors {
  bg: string;
  cardBg: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  accentMuted: string;
  brandRed: string;
  badgeBg: string;
  badgeText: string;
  /** Marker color for pulse dot placeholders (replaced post-render) */
  pulseDotMarker: string;
  /** Preview page colors */
  previewBg: string;
  previewFg: string;
  previewMuted: string;
}

const dark: ThemeColors = {
  bg: "#050505",
  cardBg: "#0a0a0a",
  text: "#f8fafc",
  muted: "#6b7280",
  border: "#1a1a1a",
  accent: "#22c55e",
  accentMuted: "#052e16",
  brandRed: "#b91c1c",
  badgeBg: "#b91c1c",
  badgeText: "#ffffff",
  pulseDotMarker: "#fe0099",
  previewBg: "#111",
  previewFg: "#fff",
  previewMuted: "#888",
};

const light: ThemeColors = {
  bg: "#ffffff",
  cardBg: "#f8fafc",
  text: "#0a0a0a",
  muted: "#6b7280",
  border: "#e4e4e7",
  accent: "#16a34a",
  accentMuted: "#bbf7d0",
  brandRed: "#991b1b",
  badgeBg: "#991b1b",
  badgeText: "#ffffff",
  pulseDotMarker: "#fe0099",
  previewBg: "#fff",
  previewFg: "#000",
  previewMuted: "#666",
};

export function themeVars(theme: Theme): ThemeColors {
  if (theme === "light") return light;
  return dark; // dark and auto both resolve to dark
}

export function parseTheme(raw: string | undefined): Theme {
  if (raw === "dark" || raw === "light") return raw;
  return "auto";
}
