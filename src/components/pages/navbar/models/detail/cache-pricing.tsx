"use client";

import type { ProcessedModel } from "@/lib/api/pricing";
import { getVendorTheme } from "@/lib/config/vendor-themes";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/utils/base";
import { useTranslations } from "next-intl";

type CacheTier = {
  labelKey: string;
  multiplier: number;
};

const CACHE_TIERS_BY_VENDOR: Record<string, CacheTier[]> = {
  anthropic: [
    { labelKey: "MODELS.PRICE.CACHE_WRITE_5M", multiplier: 1.25 },
    { labelKey: "MODELS.PRICE.CACHE_WRITE_1H", multiplier: 2 },
    { labelKey: "MODELS.PRICE.CACHE_READ", multiplier: 0.1 },
  ],
};

export function getCacheTiers(vendorName: string): CacheTier[] | null {
  const tiers = CACHE_TIERS_BY_VENDOR[vendorName.toLowerCase()];
  return tiers ?? null;
}

export function CachePricing(props: {
  model: ProcessedModel;
  theme: ReturnType<typeof getVendorTheme>;
}) {
  const t = useTranslations();
  const tiers = getCacheTiers(props.model.vendor.name);

  if (!tiers || props.model.isFixedPrice) return null;

  const cols =
    tiers.length === 1
      ? "grid-cols-1"
      : tiers.length === 2
        ? "grid-cols-2"
        : "grid-cols-3";

  return (
    <div className={cn("border-border/40 mt-3 grid gap-3 border-t pt-3", cols)}>
      {tiers.map((tier) => (
        <div key={tier.labelKey}>
          <span className="text-muted-foreground font-mono text-[10px] uppercase">
            {t(tier.labelKey as Parameters<typeof t>[0])}
          </span>
          <div className={cn("font-mono text-sm font-bold", props.theme.text)}>
            {formatPrice(props.model.inputPrice * tier.multiplier)}
          </div>
          <span className="text-muted-foreground font-mono text-[10px]">
            {t("MODELS.PRICE.PER_MILLION")}
          </span>
        </div>
      ))}
    </div>
  );
}
