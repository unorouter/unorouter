import type { BadgeSize } from "@/lib/validation/badge";

// ── Base ──────────────────────────────────────────────────

export interface BadgeDimsBase {
  W: number;
  H: number;
  pad: number;
}

/** Look up dims for requested size, fall back to `md` if not defined */
export function resolveDims<T extends BadgeDimsBase>(
  configs: Partial<Record<BadgeSize, T>>,
  size: BadgeSize,
): T {
  return configs[size] ?? configs.md!;
}

// ── Tokens Banner ─────────────────────────────────────────

export interface BannerDims extends BadgeDimsBase {
  logoSize: number;
  brandFont: number;
  brandGap: number;
  statSize: number;
  labelSize: number;
  divMargin: string;
  dotSize: number;
}

export const BANNER_DIMS: Partial<Record<BadgeSize, BannerDims>> = {
  xs: {
    W: 300,
    H: 65,
    pad: 10,
    logoSize: 20,
    brandFont: 9,
    brandGap: 6,
    statSize: 13,
    labelSize: 7,
    divMargin: "0 8px",
    dotSize: 5,
  },
  sm: {
    W: 380,
    H: 80,
    pad: 14,
    logoSize: 26,
    brandFont: 11,
    brandGap: 8,
    statSize: 16,
    labelSize: 9,
    divMargin: "0 12px",
    dotSize: 6,
  },
  md: {
    W: 500,
    H: 105,
    pad: 20,
    logoSize: 34,
    brandFont: 14,
    brandGap: 10,
    statSize: 19,
    labelSize: 10,
    divMargin: "0 18px",
    dotSize: 7,
  },
  lg: {
    W: 620,
    H: 130,
    pad: 26,
    logoSize: 42,
    brandFont: 17,
    brandGap: 12,
    statSize: 24,
    labelSize: 12,
    divMargin: "0 22px",
    dotSize: 8,
  },
  xl: {
    W: 760,
    H: 160,
    pad: 32,
    logoSize: 52,
    brandFont: 21,
    brandGap: 14,
    statSize: 30,
    labelSize: 14,
    divMargin: "0 28px",
    dotSize: 10,
  },
};

// ── Tokens Square ─────────────────────────────────────────

export interface SquareDims extends BadgeDimsBase {
  logo: number;
  brandFont: number;
  valueSize: number;
  labelSize: number;
  gap: number;
  radius: number;
  dotR: number;
  dotY: number;
}

export const SQUARE_DIMS: Partial<Record<BadgeSize, SquareDims>> = {
  xs: {
    W: 110,
    H: 110,
    pad: 10,
    logo: 28,
    brandFont: 8,
    valueSize: 12,
    labelSize: 7,
    gap: 4,
    radius: 10,
    dotR: 1.5,
    dotY: 96,
  },
  sm: {
    W: 140,
    H: 140,
    pad: 14,
    logo: 36,
    brandFont: 10,
    valueSize: 16,
    labelSize: 8,
    gap: 5,
    radius: 12,
    dotR: 2,
    dotY: 124,
  },
  md: {
    W: 176,
    H: 176,
    pad: 20,
    logo: 48,
    brandFont: 12,
    valueSize: 20,
    labelSize: 9,
    gap: 7,
    radius: 14,
    dotR: 2.5,
    dotY: 156,
  },
  lg: {
    W: 220,
    H: 220,
    pad: 26,
    logo: 60,
    brandFont: 15,
    valueSize: 26,
    labelSize: 11,
    gap: 9,
    radius: 16,
    dotR: 3,
    dotY: 196,
  },
  xl: {
    W: 280,
    H: 280,
    pad: 34,
    logo: 76,
    brandFont: 19,
    valueSize: 34,
    labelSize: 14,
    gap: 12,
    radius: 18,
    dotR: 4,
    dotY: 250,
  },
};

// ── Sponsor ───────────────────────────────────────────────

export interface SponsorDims extends BadgeDimsBase {
  layout: "horizontal" | "twoColumn";
  logoSize: number;
  brandFont: number;
  brandGap: number;
  statSize: number;
  labelSize: number;
  dotSize: number;
  // two-column only
  rightWidth: number;
  bulletFont: number;
  ctaFont: number;
  modelCountFont: number;
}

export const SPONSOR_DIMS: Partial<Record<BadgeSize, SponsorDims>> = {
  xs: {
    W: 380,
    H: 90,
    pad: 16,
    layout: "horizontal",
    logoSize: 22,
    brandFont: 11,
    brandGap: 8,
    statSize: 13,
    labelSize: 7,
    dotSize: 5,
    rightWidth: 0,
    bulletFont: 0,
    ctaFont: 0,
    modelCountFont: 0,
  },
  sm: {
    W: 480,
    H: 120,
    pad: 24,
    layout: "horizontal",
    logoSize: 28,
    brandFont: 14,
    brandGap: 10,
    statSize: 16,
    labelSize: 8,
    dotSize: 7,
    rightWidth: 0,
    bulletFont: 0,
    ctaFont: 0,
    modelCountFont: 0,
  },
  md: {
    W: 700,
    H: 245,
    pad: 28,
    layout: "twoColumn",
    logoSize: 38,
    brandFont: 18,
    brandGap: 12,
    statSize: 19,
    labelSize: 11,
    dotSize: 7,
    rightWidth: 300,
    bulletFont: 12,
    ctaFont: 10,
    modelCountFont: 12,
  },
  lg: {
    W: 860,
    H: 300,
    pad: 34,
    layout: "twoColumn",
    logoSize: 46,
    brandFont: 22,
    brandGap: 14,
    statSize: 24,
    labelSize: 13,
    dotSize: 9,
    rightWidth: 370,
    bulletFont: 14,
    ctaFont: 12,
    modelCountFont: 14,
  },
  xl: {
    W: 1040,
    H: 370,
    pad: 42,
    layout: "twoColumn",
    logoSize: 56,
    brandFont: 27,
    brandGap: 18,
    statSize: 30,
    labelSize: 16,
    dotSize: 11,
    rightWidth: 450,
    bulletFont: 17,
    ctaFont: 14,
    modelCountFont: 17,
  },
};

// ── Providers ─────────────────────────────────────────────

export interface ProvidersDims extends BadgeDimsBase {
  headerFont: number;
  maxIcons: number;
  iconSize: number;
  slotWidth: number;
  gridGap: number;
  showBadge: boolean;
}

export const PROVIDERS_DIMS: Partial<Record<BadgeSize, ProvidersDims>> = {
  xs: {
    W: 280,
    H: 110,
    pad: 12,
    headerFont: 9,
    maxIcons: 4,
    iconSize: 18,
    slotWidth: 40,
    gridGap: 6,
    showBadge: false,
  },
  sm: {
    W: 360,
    H: 140,
    pad: 16,
    headerFont: 11,
    maxIcons: 6,
    iconSize: 22,
    slotWidth: 48,
    gridGap: 8,
    showBadge: false,
  },
  md: {
    W: 400,
    H: 245,
    pad: 20,
    headerFont: 12,
    maxIcons: 14,
    iconSize: 24,
    slotWidth: 56,
    gridGap: 10,
    showBadge: true,
  },
  lg: {
    W: 500,
    H: 300,
    pad: 24,
    headerFont: 14,
    maxIcons: 14,
    iconSize: 30,
    slotWidth: 68,
    gridGap: 12,
    showBadge: true,
  },
  xl: {
    W: 620,
    H: 370,
    pad: 30,
    headerFont: 17,
    maxIcons: 14,
    iconSize: 38,
    slotWidth: 84,
    gridGap: 14,
    showBadge: true,
  },
};

// ── Pricing ───────────────────────────────────────────────

export interface PricingDims extends BadgeDimsBase {
  showOriginal: boolean;
  modelWidth: number;
  priceWidth: number;
  discountWidth: number;
  iconSize: number;
  maxRows: number;
  rowHeight: number;
  headerLogoSize: number;
  headerFont: number;
}

/** Compute tight W/H for pricing based on column widths and row count */
export function pricingDims(
  d: PricingDims,
  rowCount: number,
): { W: number; H: number } {
  const cols = d.modelWidth + d.iconSize + 6 + d.priceWidth * 2 + (d.showOriginal ? d.discountWidth : 0);
  const W = cols + d.pad * 2;
  // header(~30) + divider line(~26) + rows + footer(showOriginal ? ~24 : 0) + padding
  const headerH = 30;
  const dividerH = 26;
  const footerH = d.showOriginal ? 24 : 0;
  const H = d.pad * 2 + headerH + dividerH + rowCount * d.rowHeight + footerH;
  return { W, H };
}

export const PRICING_DIMS: Partial<Record<BadgeSize, PricingDims>> = {
  xs: {
    W: 0, H: 0, pad: 14,
    showOriginal: false, modelWidth: 110, priceWidth: 65, discountWidth: 0, iconSize: 10,
    maxRows: 3, rowHeight: 30, headerLogoSize: 16, headerFont: 10,
  },
  sm: {
    W: 0, H: 0, pad: 18,
    showOriginal: false, modelWidth: 130, priceWidth: 80, discountWidth: 0, iconSize: 11,
    maxRows: 3, rowHeight: 32, headerLogoSize: 18, headerFont: 11,
  },
  md: {
    W: 0, H: 0, pad: 24,
    showOriginal: true, modelWidth: 140, priceWidth: 88, discountWidth: 60, iconSize: 12,
    maxRows: 99, rowHeight: 38, headerLogoSize: 20, headerFont: 12,
  },
  lg: {
    W: 0, H: 0, pad: 30,
    showOriginal: true, modelWidth: 160, priceWidth: 100, discountWidth: 65, iconSize: 14,
    maxRows: 99, rowHeight: 42, headerLogoSize: 24, headerFont: 14,
  },
  xl: {
    W: 0, H: 0, pad: 38,
    showOriginal: true, modelWidth: 190, priceWidth: 120, discountWidth: 70, iconSize: 16,
    maxRows: 99, rowHeight: 48, headerLogoSize: 28, headerFont: 17,
  },
};

// ── Hero ──────────────────────────────────────────────────

export interface HeroDims extends BadgeDimsBase {
  logoSize: number;
  brandFont: number;
  headingSize: number;
  headingSpacing: number;
  metricFont: number;
  tokenFont: number;
  tokenLabelFont: number;
  dotSize: number;
  pulseDotSize: number;
  metricWidth: string;
  showMetrics: boolean;
}

export const HERO_DIMS: Partial<Record<BadgeSize, HeroDims>> = {
  xs: {
    W: 280,
    H: 120,
    pad: 14,
    logoSize: 20,
    brandFont: 10,
    headingSize: 14,
    headingSpacing: 1,
    metricFont: 9,
    tokenFont: 10,
    tokenLabelFont: 8,
    dotSize: 3,
    pulseDotSize: 4,
    metricWidth: "45%",
    showMetrics: false,
  },
  sm: {
    W: 360,
    H: 160,
    pad: 20,
    logoSize: 26,
    brandFont: 13,
    headingSize: 18,
    headingSpacing: 2,
    metricFont: 11,
    tokenFont: 12,
    tokenLabelFont: 10,
    dotSize: 4,
    pulseDotSize: 5,
    metricWidth: "45%",
    showMetrics: false,
  },
  md: {
    W: 440,
    H: 230,
    pad: 24,
    logoSize: 32,
    brandFont: 16,
    headingSize: 24,
    headingSpacing: 3,
    metricFont: 12,
    tokenFont: 12,
    tokenLabelFont: 11,
    dotSize: 5,
    pulseDotSize: 6,
    metricWidth: "45%",
    showMetrics: true,
  },
  lg: {
    W: 540,
    H: 280,
    pad: 30,
    logoSize: 40,
    brandFont: 20,
    headingSize: 30,
    headingSpacing: 4,
    metricFont: 14,
    tokenFont: 14,
    tokenLabelFont: 13,
    dotSize: 6,
    pulseDotSize: 7,
    metricWidth: "45%",
    showMetrics: true,
  },
  xl: {
    W: 660,
    H: 350,
    pad: 38,
    logoSize: 50,
    brandFont: 25,
    headingSize: 38,
    headingSpacing: 5,
    metricFont: 17,
    tokenFont: 17,
    tokenLabelFont: 16,
    dotSize: 8,
    pulseDotSize: 9,
    metricWidth: "45%",
    showMetrics: true,
  },
};

// ── Referral ──────────────────────────────────────────────

export interface ReferralDims extends BadgeDimsBase {
  logoSize: number;
  brandFont: number;
  brandGap: number;
  badgeFont: number;
  subtitleFont: number;
  urlFont: number;
  urlPad: string;
  ctaFont: number;
  ctaPad: string;
  radius: number;
  showSubtitle: boolean;
  showCta: boolean;
}

export const REFERRAL_DIMS: Partial<Record<BadgeSize, ReferralDims>> = {
  xs: {
    W: 300,
    H: 80,
    pad: 12,
    logoSize: 20,
    brandFont: 10,
    brandGap: 5,
    badgeFont: 8,
    subtitleFont: 9,
    urlFont: 9,
    urlPad: "4px 10px",
    ctaFont: 8,
    ctaPad: "2px 6px",
    radius: 4,
    showSubtitle: false,
    showCta: false,
  },
  sm: {
    W: 360,
    H: 100,
    pad: 16,
    logoSize: 24,
    brandFont: 12,
    brandGap: 6,
    badgeFont: 9,
    subtitleFont: 11,
    urlFont: 11,
    urlPad: "5px 12px",
    ctaFont: 9,
    ctaPad: "3px 8px",
    radius: 5,
    showSubtitle: false,
    showCta: false,
  },
  md: {
    W: 420,
    H: 140,
    pad: 24,
    logoSize: 28,
    brandFont: 14,
    brandGap: 8,
    badgeFont: 10,
    subtitleFont: 12,
    urlFont: 12,
    urlPad: "6px 14px",
    ctaFont: 10,
    ctaPad: "3px 10px",
    radius: 6,
    showSubtitle: true,
    showCta: true,
  },
  lg: {
    W: 520,
    H: 170,
    pad: 30,
    logoSize: 34,
    brandFont: 17,
    brandGap: 10,
    badgeFont: 12,
    subtitleFont: 14,
    urlFont: 14,
    urlPad: "7px 16px",
    ctaFont: 12,
    ctaPad: "4px 12px",
    radius: 7,
    showSubtitle: true,
    showCta: true,
  },
  xl: {
    W: 640,
    H: 210,
    pad: 38,
    logoSize: 42,
    brandFont: 21,
    brandGap: 12,
    badgeFont: 14,
    subtitleFont: 17,
    urlFont: 17,
    urlPad: "8px 20px",
    ctaFont: 14,
    ctaPad: "5px 14px",
    radius: 8,
    showSubtitle: true,
    showCta: true,
  },
};
