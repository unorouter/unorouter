import type { BadgeSize } from "@/lib/validation/badge";
import type { Locale } from "next-intl";
import type { BadgePricing, BadgeStats } from "../cache";
import type { Theme } from "./theme";

export interface BadgeCtx {
  locale: Locale;
  theme: Theme;
  size: BadgeSize;
  ref?: string;
  stats: BadgeStats;
  pricing: BadgePricing;
}
