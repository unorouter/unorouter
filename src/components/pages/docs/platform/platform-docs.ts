import type { Pathname } from "@/i18n/routing";
import type { TranslationKey } from "@/lib/config/constants";
import type { IconName } from "@/lib/config/icon-map";
import type { DocI18nPrefix } from "@/lib/types";

export type PlatformDocSection = "GUIDE" | "FAQ";

export interface PlatformDocHeading {
  id: string;
  i18nLeaf: string;
  level: 2 | 3;
}

export interface PlatformDoc {
  slug: string;
  href: Pathname;
  i18nPrefix: DocI18nPrefix;
  section: PlatformDocSection;
  iconName: IconName;
  headings: PlatformDocHeading[];
}

const platformDocHref = (slug: string): Pathname => ({
  pathname: "/docs/platform/[slug]",
  params: { slug },
});

function platformDoc(input: {
  slug: string;
  name: Extract<
    DocI18nPrefix,
    `DOCS_PLATFORM.${string}`
  > extends `DOCS_PLATFORM.${infer N}`
    ? N
    : never;
  section: PlatformDocSection;
  iconName: IconName;
  headings: [string, string][];
}): PlatformDoc {
  return {
    slug: input.slug,
    href: platformDocHref(input.slug),
    i18nPrefix: `DOCS_PLATFORM.${input.name}`,
    section: input.section,
    iconName: input.iconName,
    headings: input.headings.map(([id, leaf]) => ({
      id,
      i18nLeaf: leaf,
      level: 2,
    })),
  };
}

export const PLATFORM_DOCS: PlatformDoc[] = [
  platformDoc({
    slug: "quickstart",
    name: "QUICKSTART",
    section: "GUIDE",
    iconName: "zap",
    headings: [
      ["overview", "H_OVERVIEW"],
      ["base-url", "H_BASE_URL"],
      ["api-key", "H_API_KEY"],
      ["first-request", "H_FIRST_REQUEST"],
      ["sdks", "H_SDKS"],
      ["next", "H_NEXT"],
    ],
  }),
  platformDoc({
    slug: "models-and-pricing",
    name: "MODELS_AND_PRICING",
    section: "GUIDE",
    iconName: "dollar-sign",
    headings: [
      ["catalog", "H_CATALOG"],
      ["free-vs-paid", "H_FREE_VS_PAID"],
      ["discounts", "H_DISCOUNTS"],
      ["pricing", "H_PRICING"],
      ["prompt-cache", "H_PROMPT_CACHE"],
      ["availability", "H_AVAILABILITY"],
    ],
  }),
  platformDoc({
    slug: "notifications",
    name: "NOTIFICATIONS",
    section: "GUIDE",
    iconName: "bell",
    headings: [
      ["overview", "H_OVERVIEW"],
      ["watching", "H_WATCHING"],
      ["wildcards", "H_WILDCARDS"],
      ["alerts", "H_ALERTS"],
      ["push", "H_PUSH"],
      ["events", "H_EVENTS"],
    ],
  }),
  platformDoc({
    slug: "group-pinning",
    name: "GROUP_PINNING",
    section: "GUIDE",
    iconName: "layers",
    headings: [
      ["overview", "H_OVERVIEW"],
      ["prices", "H_PRICES"],
      ["pinning", "H_PINNING"],
      ["routing", "H_ROUTING"],
      ["header-override", "H_HEADER_OVERRIDE"],
      ["errors", "H_ERRORS"],
    ],
  }),
  platformDoc({
    slug: "errors-and-rate-limits",
    name: "ERRORS_AND_RATE_LIMITS",
    section: "FAQ",
    iconName: "triangle-alert",
    headings: [
      ["rate-limits", "H_RATE_LIMITS"],
      ["free-model-limit", "H_FREE_MODEL_LIMIT"],
      ["trial-caps", "H_TRIAL_CAPS"],
      ["envelope", "H_ENVELOPE"],
      ["status-codes", "H_STATUS_CODES"],
      ["busy-vs-unknown", "H_BUSY_VS_UNKNOWN"],
      ["retries", "H_RETRIES"],
    ],
  }),
  platformDoc({
    slug: "account-and-billing",
    name: "ACCOUNT_AND_BILLING",
    section: "FAQ",
    iconName: "credit-card",
    headings: [
      ["balance", "H_BALANCE"],
      ["topup", "H_TOPUP"],
      ["earn", "H_EARN"],
      ["keys", "H_KEYS"],
      ["charges", "H_CHARGES"],
      ["logs", "H_LOGS"],
    ],
  }),
  platformDoc({
    slug: "discord-rewards",
    name: "DISCORD_REWARDS",
    section: "FAQ",
    iconName: "gift",
    headings: [
      ["overview", "H_OVERVIEW"],
      ["link", "H_LINK"],
      ["rewards", "H_REWARDS"],
      ["recurring", "H_RECURRING"],
      ["invites", "H_INVITES"],
      ["tag", "H_TAG"],
      ["levels", "H_LEVELS"],
      ["bounty", "H_BOUNTY"],
      ["notifications", "H_NOTIFICATIONS"],
      ["rules", "H_RULES"],
    ],
  }),
];

export const PLATFORM_DOC_SECTION_ORDER: PlatformDocSection[] = [
  "GUIDE",
  "FAQ",
];

export const PLATFORM_DOC_SECTION_LABELS: Record<
  PlatformDocSection,
  TranslationKey
> = {
  GUIDE: "DOCS_PLATFORM.COMMON.SECTION_GUIDE",
  FAQ: "DOCS_PLATFORM.COMMON.SECTION_FAQ",
};

export function getPlatformDoc(slug: string): PlatformDoc | undefined {
  return PLATFORM_DOCS.find((doc) => doc.slug === slug);
}

export function platformDocsBySection(): Record<
  PlatformDocSection,
  PlatformDoc[]
> {
  const out: Record<PlatformDocSection, PlatformDoc[]> = {
    GUIDE: [],
    FAQ: [],
  };
  for (const doc of PLATFORM_DOCS) out[doc.section].push(doc);
  return out;
}
