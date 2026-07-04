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

// Image/video model vendors for the og grid.
const PLAYGROUND_VENDOR_ICONS = [
  "flux",
  "stability",
  "kling",
  "bytedance",
  "minimax",
  "google",
]
  .map(getVendorColorIcon)
  .filter((s): s is string => typeof s === "string");

const DIMS: Record<BadgeSize, FeatureBadgeDims> = {
  ...FEATURE_BADGE_DIMS,
  og: {
    ...FEATURE_BADGE_DIMS.og,
    count: 6,
    vendorGrid: { cols: 2, rows: 3, cell: 96, icon: 52, gap: 14 },
  },
};

const FEATURES: { key: string; icon: string }[] = [
  {
    key: "BADGE.PLAYGROUND_IMAGE_VIDEO",
    // clapperboard
    icon: lucide(
      `<path d="m12.296 3.464 3.02 3.956"/><path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3z"/><path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="m6.18 5.276 3.1 3.899"/>`,
    ),
  },
  {
    key: "BADGE.PLAYGROUND_COMFY",
    // workflow
    icon: lucide(
      `<rect width="8" height="8" x="3" y="3" rx="2"/><path d="M7 11v4a2 2 0 0 0 2 2h4"/><rect width="8" height="8" x="13" y="13" rx="2"/>`,
    ),
  },
  {
    key: "BADGE.PLAYGROUND_LORAS",
    // layers
    icon: lucide(
      `<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/>`,
    ),
  },
  {
    key: "BADGE.PLAYGROUND_UPSCALE",
    // zoom-in
    icon: lucide(
      `<circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="11" x2="11" y1="8" y2="14"/><line x1="8" x2="14" y1="11" y2="11"/>`,
    ),
  },
  {
    key: "BADGE.PLAYGROUND_REFS",
    // images
    icon: lucide(
      `<path d="m22 11-1.296-1.296a2.4 2.4 0 0 0-3.408 0L11 16"/><path d="M4 8a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2"/><circle cx="13" cy="7" r="1" fill="#ffffff"/><rect x="8" y="2" width="14" height="14" rx="2"/>`,
    ),
  },
  {
    key: "BADGE.PLAYGROUND_FREE",
    // sparkles
    icon: lucide(
      `<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/><path d="M20 2v4"/><path d="M22 4h-4"/><circle cx="4" cy="20" r="2"/>`,
    ),
  },
];

export async function generatePlayground(ctx: BadgeCtx): Promise<string> {
  return renderFeatureBadge({
    ctx,
    dims: DIMS,
    suffix: "PLAYGROUND",
    tagline: t(ctx.locale, "BADGE.PLAYGROUND_TAGLINE"),
    features: FEATURES.map((f) => ({
      label: t(ctx.locale, f.key),
      icon: f.icon,
    })),
    vendorIcons: PLAYGROUND_VENDOR_ICONS,
  });
}
