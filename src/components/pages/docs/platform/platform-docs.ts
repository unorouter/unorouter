import type { TranslationKey } from "@/lib/config/constants";
import type { DocI18nPrefix } from "@/lib/types";
import { makeDocs, type Doc } from "../doc-registry";

export type PlatformDocSection = "GUIDE" | "FAQ";

export type PlatformDoc = Doc<PlatformDocSection>;

type PlatformDocName =
  Extract<
    DocI18nPrefix,
    `DOCS_PLATFORM.${string}`
  > extends `DOCS_PLATFORM.${infer N}`
    ? N
    : never;

export const PLATFORM_DOCS: PlatformDoc[] = makeDocs(
  "/docs/platform/[slug]",
  (name: PlatformDocName) => `DOCS_PLATFORM.${name}`,
  [
    {
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
    },
    {
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
    },
    {
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
    },
    {
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
    },
    {
      slug: "platform-api",
      name: "PLATFORM_API",
      section: "GUIDE",
      iconName: "key-round",
      headings: [
        ["overview", "H_OVERVIEW"],
        ["credentials", "H_CREDENTIALS"],
        ["access-token", "H_ACCESS_TOKEN"],
        ["catalog", "H_CATALOG"],
        ["model-prices", "H_MODEL_PRICES"],
        ["models", "H_MODELS"],
        ["account", "H_ACCOUNT"],
        ["keys", "H_KEYS"],
        ["usage", "H_USAGE"],
        ["conventions", "H_CONVENTIONS"],
      ],
    },
    {
      slug: "consents",
      name: "CONSENTS",
      section: "GUIDE",
      iconName: "shield-check",
      headings: [
        ["why", "H_WHY"],
        ["how", "H_HOW"],
        ["objection", "H_OBJECTION"],
        ["api", "H_API"],
        ["rollout", "H_ROLLOUT"],
      ],
    },
    {
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
    },
    {
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
    },
    {
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
    },
  ],
);

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
