import type { BadgeSize, Theme } from "@/lib/validation/badge";
import type { Locale } from "next-intl";
import type { ReactNode } from "react";

export interface BadgeStats {
  tokenUsed: number;
  requestCount: number;
  avgTpm: number;
}

export interface BadgePricingRow {
  model: string;
  vendor: string;
  inputPrice: number;
  outputPrice: number;
  originalInputPrice: number | null;
  originalOutputPrice: number | null;
}

export interface BadgePricing {
  modelCount: number;
  vendorCount: number;
  vendorNames: string[];
  vendorModelCounts: Record<string, number>;
  rows: BadgePricingRow[];
}

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
  pulseDotMarker: string;
  previewBg: string;
  previewFg: string;
  previewMuted: string;
}

export interface BadgeCtx {
  locale: Locale;
  theme: Theme;
  size: BadgeSize;
  ref?: string;
  stats: BadgeStats;
  pricing: BadgePricing;
  staticMode?: boolean;
}

export interface BadgeDimsBase {
  W: number;
  H: number;
  pad: number;
}

export interface CipherTarget {
  value: string;
  fontSize: number;
  color: string;
  markerColor: string;
  loop?: boolean;
}

export interface RenderTemplateOpts {
  node: ReactNode;
  width: number;
  height: number;
  smil?: string;
  pulseDot?: { markerColor: string; accentColor: string };
  cipherTargets?: CipherTarget[];
  staticMode?: boolean;
}
