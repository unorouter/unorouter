"use client";

import type { PricingCatalogDetail } from "@/openapi";
import { TranslationKey } from "@/lib/config/constants";
import { getVendorTheme } from "@/lib/config/vendor-registry";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/utils/format/number";
import { useTranslations } from "next-intl";

type CacheTier = {
  labelKey: TranslationKey;
  multiplier: number;
};

function getCacheTiers(model: PricingCatalogDetail): CacheTier[] | null {
  const tiers: CacheTier[] = [];
  if (model.create_cache_ratio != null && model.create_cache_ratio > 0) {
    tiers.push({
      labelKey: "MODELS.PRICE.CACHE_WRITE",
      multiplier: model.create_cache_ratio,
    });
  }
  if (model.cache_ratio != null && model.cache_ratio > 0) {
    tiers.push({
      labelKey: "MODELS.PRICE.CACHE_READ",
      multiplier: model.cache_ratio,
    });
  }
  return tiers.length > 0 ? tiers : null;
}

export function CachePricing(props: {
  model: PricingCatalogDetail;
  theme: ReturnType<typeof getVendorTheme>;
}) {
  const t = useTranslations();
  if (props.model.is_fixed_price) return null;
  const tiers = getCacheTiers(props.model);
  if (!tiers) return null;

  const cols = tiers.length === 1 ? "grid-cols-1" : "grid-cols-2";

  return (
    <div className={cn("border-border/40 mt-3 grid gap-3 border-t pt-3", cols)}>
      {tiers.map((tier) => (
        <div key={tier.labelKey}>
          <span className="text-muted-foreground font-mono text-[10px] uppercase">
            {t(tier.labelKey)}
          </span>
          <div className={cn("font-mono text-sm font-bold", props.theme.text)}>
            {formatPrice(props.model.input_price * tier.multiplier)}
          </div>
          <span className="text-muted-foreground font-mono text-[10px]">
            {t("MODELS.PRICE.PER_MILLION")}
          </span>
        </div>
      ))}
    </div>
  );
}
