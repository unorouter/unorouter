import satori from "satori";
import { readFileSync } from "fs";
import { join } from "path";
import type { ReactNode } from "react";

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
}

const dark: ThemeColors = {
  bg: "#050505",
  cardBg: "#0a0a0a",
  text: "#f8fafc",
  muted: "#6b7280",
  border: "#1a1a1a",
  accent: "#22c55e",
  accentMuted: "#052e16",
  brandRed: "#ef4444",
};

const light: ThemeColors = {
  bg: "#ffffff",
  cardBg: "#f8fafc",
  text: "#0a0a0a",
  muted: "#6b7280",
  border: "#e4e4e7",
  accent: "#16a34a",
  accentMuted: "#bbf7d0",
  brandRed: "#dc2626",
};

export function themeVars(theme: Theme): ThemeColors {
  if (theme === "light") return light;
  return dark; // dark and auto both resolve to dark
}

export function parseTheme(raw: string | undefined): Theme {
  if (raw === "dark" || raw === "light") return raw;
  return "auto";
}

// ── Format ─────────────────────────────────────────────────

export function formatCompact(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function formatFull(n: number): string {
  return n.toLocaleString("en-US");
}

// ── Logo ───────────────────────────────────────────────────

let cachedLogoUri: string | null = null;

export function logoDataUri(): string {
  if (cachedLogoUri) return cachedLogoUri;
  const path = join(process.cwd(), "public", "logo.png");
  const buffer = readFileSync(path);
  cachedLogoUri = `data:image/png;base64,${buffer.toString("base64")}`;
  return cachedLogoUri;
}

// ── Satori renderer ────────────────────────────────────────

const fontsDir = join(process.cwd(), "src", "server", "badge", "fonts");

const fonts = [
  {
    name: "Space Grotesk",
    data: readFileSync(join(fontsDir, "space-grotesk-400.ttf")),
    weight: 400 as const,
    style: "normal" as const,
  },
  {
    name: "Space Grotesk",
    data: readFileSync(join(fontsDir, "space-grotesk-700.ttf")),
    weight: 700 as const,
    style: "normal" as const,
  },
  {
    name: "JetBrains Mono",
    data: readFileSync(join(fontsDir, "jetbrains-mono-700.ttf")),
    weight: 700 as const,
    style: "normal" as const,
  },
];

/** Render a React JSX tree to SVG via Satori, then inject optional SMIL animations */
export async function renderBadge(
  node: ReactNode,
  width: number,
  height: number,
  smilInjections?: string,
): Promise<string> {
  let svg = await satori(node as never, { width, height, fonts });

  if (smilInjections) {
    svg = svg.replace("</svg>", `${smilInjections}</svg>`);
  }

  return svg;
}
