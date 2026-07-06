"use client";

import type { ProcessedModel } from "@/lib/api/pricing";
import {
  computeMinGroupRatio,
  parseTiersWithFallback,
  tierDisplayPrices,
  type TierPriceRow,
} from "@/lib/api/tiered-pricing";
import { getVendorTheme } from "@/lib/config/vendor-themes";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/utils/format/number";
import { useTranslations } from "next-intl";

type TieredPricingProps = {
  model: ProcessedModel;
  theme: ReturnType<typeof getVendorTheme>;
  groupRatioMap: Record<string, number>;
};

export function TieredPricing(props: TieredPricingProps) {
  const t = useTranslations();
  if (!props.model.isTiered || !props.model.billingExpr) return null;

  const minRatio = computeMinGroupRatio(
    props.model.enableGroups,
    props.groupRatioMap,
  );
  const parsed = parseTiersWithFallback(props.model.billingExpr);

  if (parsed.isSpecial) {
    return (
      <div className="border-border/40 mt-3 border-t pt-3">
        <span className="text-muted-foreground font-mono text-[10px] uppercase">
          {t("MODELS.PRICE.TIERED")}
        </span>
        <div
          className={cn(
            "mt-1 font-mono text-xs break-all italic",
            props.theme.text,
          )}
        >
          {t("MODELS.PRICE.TIERED_SPECIAL")}
        </div>
      </div>
    );
  }

  const rows: TierPriceRow[] = parsed.tiers.map((tier) =>
    tierDisplayPrices(tier, minRatio),
  );
  const showCacheRead = rows.some((r) => r.cacheReadPrice > 0);
  const showCacheCreate = rows.some((r) => r.cacheCreatePrice > 0);
  const cols = [
    "minmax(0,1fr)",
    "auto",
    "auto",
    showCacheRead ? "auto" : null,
    showCacheCreate ? "auto" : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="border-border/40 mt-3 border-t pt-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-muted-foreground font-mono text-[10px] tracking-wider uppercase">
          {t("MODELS.PRICE.TIERED")}
        </span>
      </div>
      <div
        className="grid items-baseline gap-x-4 gap-y-1.5"
        style={{ gridTemplateColumns: cols }}
      >
        <span className="text-muted-foreground font-mono text-[10px] uppercase">
          {t("MODELS.PRICE.TIER_LABEL")}
        </span>
        <span className="text-muted-foreground text-right font-mono text-[10px] uppercase">
          {t("MODELS.PRICE.INPUT")}
        </span>
        <span className="text-muted-foreground text-right font-mono text-[10px] uppercase">
          {t("MODELS.PRICE.OUTPUT")}
        </span>
        {showCacheRead && (
          <span className="text-muted-foreground text-right font-mono text-[10px] uppercase">
            {t("MODELS.PRICE.CACHE_READ")}
          </span>
        )}
        {showCacheCreate && (
          <span className="text-muted-foreground text-right font-mono text-[10px] uppercase">
            {t("MODELS.PRICE.CACHE_WRITE")}
          </span>
        )}
        {rows.map((row, i) => (
          <Row
            key={`${row.label}-${i}`}
            row={row}
            theme={props.theme}
            showCacheRead={showCacheRead}
            showCacheCreate={showCacheCreate}
          />
        ))}
      </div>
      <span className="text-muted-foreground mt-2 block font-mono text-[10px]">
        {t("MODELS.PRICE.PER_MILLION")}
      </span>
    </div>
  );
}

function Row(props: {
  row: TierPriceRow;
  theme: ReturnType<typeof getVendorTheme>;
  showCacheRead: boolean;
  showCacheCreate: boolean;
}) {
  return (
    <>
      <span className="text-muted-foreground truncate font-mono text-xs">
        {props.row.label}
      </span>
      <span
        className={cn(
          "text-right font-mono text-xs font-medium",
          props.theme.text,
        )}
      >
        {formatPrice(props.row.inputPrice)}
      </span>
      <span
        className={cn(
          "text-right font-mono text-xs font-medium",
          props.theme.text,
        )}
      >
        {formatPrice(props.row.outputPrice)}
      </span>
      {props.showCacheRead && (
        <span
          className={cn(
            "text-right font-mono text-xs font-medium",
            props.theme.text,
          )}
        >
          {formatPrice(props.row.cacheReadPrice)}
        </span>
      )}
      {props.showCacheCreate && (
        <span
          className={cn(
            "text-right font-mono text-xs font-medium",
            props.theme.text,
          )}
        >
          {formatPrice(props.row.cacheCreatePrice)}
        </span>
      )}
    </>
  );
}
