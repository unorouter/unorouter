import qwenIcon from "thesvg/qwen";
import {
  FEATURE_BADGE_DIMS,
  lucide,
  renderFeatureBadge,
  type FeatureBadgeDims,
} from "../elements/feature-badge";
import { t } from "../lib/assets";
import type { BadgeCtx } from "../lib/types";
import { getVendorColorIcon } from "../lib/utils";
import type { BadgeSize } from "@/lib/validation/badge";

const CHAT_VENDOR_ICONS = [
  ...["openai", "anthropic", "google", "mistral"].map(getVendorColorIcon),
  qwenIcon.variants.default,
  ...["deepseek", "xai", "zhipu", "moonshot"].map(getVendorColorIcon),
].filter((s): s is string => typeof s === "string");

const DIMS: Record<BadgeSize, FeatureBadgeDims> = {
  ...FEATURE_BADGE_DIMS,
  og: {
    ...FEATURE_BADGE_DIMS.og,
    count: 10,
    vendorGrid: { cols: 3, rows: 3, cell: 96, icon: 52, gap: 14 },
    statFont: 44,
  },
};

const FEATURES: { key: string; icon: string }[] = [
  {
    key: "BADGE.CHAT_CHARACTERS",
    icon: lucide(
      `<path d="M18 11c-1.5 0-2.5.5-3 2"/><path d="M4 6a2 2 0 0 0-2 2v4a5 5 0 0 0 5 5 8 8 0 0 1 5 2 8 8 0 0 1 5-2 5 5 0 0 0 5-5V8a2 2 0 0 0-2-2h-3a8 8 0 0 0-5 2 8 8 0 0 0-5-2z"/><path d="M6 11c1.5 0 2.5.5 3 2"/>`,
    ),
  },
  {
    key: "BADGE.CHAT_LOREBOOKS",
    icon: lucide(
      `<path d="M10 2v8l3-3 3 3V2"/><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/>`,
    ),
  },
  {
    key: "BADGE.CHAT_FREE_BYOK",
    icon: lucide(
      `<path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/><circle cx="16.5" cy="7.5" r=".5" fill="#ffffff"/>`,
    ),
  },
  {
    key: "BADGE.CHAT_IMPORT_EXPORT",
    icon: lucide(
      `<path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/>`,
    ),
  },
  {
    key: "BADGE.CHAT_IMAGE_GEN",
    icon: lucide(
      `<path d="M16 5h6"/><path d="M19 2v6"/><path d="M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/><circle cx="9" cy="9" r="2"/>`,
    ),
  },
  {
    key: "BADGE.CHAT_MEMORY",
    icon: lucide(
      `<path d="M12 18V5"/><path d="M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4"/><path d="M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5"/><path d="M17.997 5.125a4 4 0 0 1 2.526 5.77"/><path d="M18 18a4 4 0 0 0 2-7.464"/><path d="M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517"/><path d="M6 18a4 4 0 0 1-2-7.464"/><path d="M6.003 5.125a4 4 0 0 0-2.526 5.77"/>`,
    ),
  },
  {
    key: "BADGE.CHAT_SCRIPTING",
    icon: lucide(
      `<path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/>`,
    ),
  },
  {
    key: "BADGE.CHAT_GROUP_CHATS",
    icon: lucide(
      `<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M16 3.128a4 4 0 0 1 0 7.744"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/>`,
    ),
  },
  {
    key: "BADGE.CHAT_PERSONAS",
    icon: lucide(
      `<path d="M16 10h2"/><path d="M16 14h2"/><path d="M6.17 15a3 3 0 0 1 5.66 0"/><circle cx="9" cy="11" r="2"/><rect x="2" y="5" width="20" height="14" rx="2"/>`,
    ),
  },
  {
    key: "BADGE.CHAT_BRANCHES",
    icon: lucide(
      `<path d="M15 6a9 9 0 0 0-9 9V3"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>`,
    ),
  },
];

export async function generateChat(ctx: BadgeCtx): Promise<string> {
  return renderFeatureBadge({
    ctx,
    dims: DIMS,
    suffix: "CHAT",
    tagline: t(ctx.locale, "BADGE.CHAT_TAGLINE"),
    features: FEATURES.map((f) => ({
      label: t(ctx.locale, f.key),
      icon: f.icon,
    })),
    vendorIcons: CHAT_VENDOR_ICONS,
    stat: {
      value: `${ctx.pricing.modelCount}+`,
      label: t(ctx.locale, "BADGE.MODELS"),
    },
  });
}
