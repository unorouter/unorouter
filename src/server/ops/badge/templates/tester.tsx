import {
  FEATURE_BADGE_DIMS,
  lucide,
  renderFeatureBadge,
  type FeatureBadgeDims,
} from "../elements/feature-badge";
import { t } from "../lib/cache";
import type { BadgeCtx } from "../lib/types";
import { getVendorColorIcon } from "../lib/utils";
import type { BadgeSize } from "@/lib/validation/badge";

// The three API formats the tester speaks (gemini = google icon).
const TESTER_VENDOR_ICONS = ["anthropic", "openai", "google"]
  .map(getVendorColorIcon)
  .filter((s): s is string => typeof s === "string");

const DIMS: Record<BadgeSize, FeatureBadgeDims> = {
  ...FEATURE_BADGE_DIMS,
  og: {
    ...FEATURE_BADGE_DIMS.og,
    count: 6,
    vendorGrid: { cols: 1, rows: 3, cell: 112, icon: 64, gap: 16 },
  },
};

const FEATURES: { key: string; icon: string }[] = [
  {
    key: "BADGE.TESTER_PROBES",
    // fingerprint-pattern
    icon: lucide(
      `<path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M2 12a10 10 0 0 1 18-6"/><path d="M2 16h.01"/><path d="M21.8 16c.2-2 .131-5.354 0-6"/><path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/><path d="M8.65 22c.21-.66.45-1.32.57-2"/><path d="M9 6.8a6 6 0 0 1 9 5.2v2"/>`,
    ),
  },
  {
    key: "BADGE.TESTER_FAKES",
    // scan-search
    icon: lucide(
      `<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/><path d="m16 16-1.9-1.9"/>`,
    ),
  },
  {
    key: "BADGE.TESTER_FORMATS",
    // plug
    icon: lucide(
      `<path d="M12 22v-5"/><path d="M15 8V2"/><path d="M17 8a1 1 0 0 1 1 1v4a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1z"/><path d="M9 8V2"/>`,
    ),
  },
  {
    key: "BADGE.TESTER_PRIVATE",
    // lock
    icon: lucide(
      `<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>`,
    ),
  },
  {
    key: "BADGE.TESTER_RANKINGS",
    // trophy
    icon: lucide(
      `<path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978"/><path d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978"/><path d="M18 9h1.5a1 1 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"/><path d="M6 9H4.5a1 1 0 0 1 0-5H6"/>`,
    ),
  },
  {
    key: "BADGE.TESTER_VERIFIED",
    // badge-check
    icon: lucide(
      `<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/>`,
    ),
  },
];

export async function generateTester(ctx: BadgeCtx): Promise<string> {
  return renderFeatureBadge({
    ctx,
    dims: DIMS,
    suffix: "TESTER",
    tagline: t(ctx.locale, "BADGE.TESTER_TAGLINE"),
    features: FEATURES.map((f) => ({
      label: t(ctx.locale, f.key),
      icon: f.icon,
    })),
    vendorIcons: TESTER_VENDOR_ICONS,
  });
}
