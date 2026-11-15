"use client";

import type { PricingCatalogDetail } from "@/openapi";
import { TranslationKey } from "@/lib/config/constants";
import { getVendorTheme } from "@/lib/config/vendor-registry";
import { cn } from "@/lib/utils";
import { discountPercent, formatPrice } from "@/lib/utils/format/number";
import { useTranslations } from "next-intl";
import { FixedPriceUnit } from "../shared/fixed-price-unit";

type Row = {
  labelKey: TranslationKey;
  price: number;
  pct: number;
};

function buildRows(model: PricingCatalogDetail): Row[] {
  if (model.is_fixed_price) {
    return [
      {
        labelKey: "MODELS.DETAIL.PRICING",
        price: model.fixed_price,
        pct: discountPercent(
          model.fixed_price,
          model.original_fixed_price ?? null,
        ),
      },
    ];
  }
  // Cache prices are the input price times a ratio, so they carry its discount.
  const inputPct = discountPercent(
    model.input_price,
    model.original_input_price ?? null,
  );
  const rows: Row[] = [
    {
      labelKey: "MODELS.PRICE.INPUT",
      price: model.input_price,
      pct: inputPct,
    },
    {
      labelKey: "MODELS.PRICE.OUTPUT",
      price: model.output_price,
      pct: discountPercent(
        model.output_price,
        model.original_output_price ?? null,
      ),
    },
  ];
  if (model.create_cache_ratio != null && model.create_cache_ratio > 0)
    rows.push({
      labelKey: "MODELS.PRICE.CACHE_WRITE",
      price: model.input_price * model.create_cache_ratio,
      pct: inputPct,
    });
  if (model.cache_ratio != null && model.cache_ratio > 0)
    rows.push({
      labelKey: "MODELS.PRICE.CACHE_READ",
      price: model.input_price * model.cache_ratio,
      pct: inputPct,
    });
  return rows;
}

export function PriceRows(props: {
  model: PricingCatalogDetail;
  theme: ReturnType<typeof getVendorTheme>;
}) {
  const t = useTranslations();
  const rows = buildRows(props.model);

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-x-2 rounded-lg border px-1 py-1 sm:grid-cols-4",
        props.theme.bg,
        props.theme.border,
      )}
    >
      {rows.map((row) => (
        <div key={row.labelKey} className="flex flex-col gap-0.5 px-2 py-1.5">
          <span className="text-muted-foreground text-[10px] uppercase">
            {t(row.labelKey)}
          </span>
          <span
            className={cn("font-medium whitespace-nowrap", props.theme.text)}
          >
            {formatPrice(row.price)}
            <span className="text-muted-foreground ml-0.5 text-[10px]">
              {props.model.is_fixed_price ? (
                <FixedPriceUnit model={props.model} />
              ) : (
                t("MODELS.PRICE.PER_MILLION")
              )}
            </span>
          </span>
          {row.pct > 0 && (
            <span className="w-fit rounded bg-green-500/15 px-1 text-[10px] whitespace-nowrap text-green-600 dark:text-green-400">
              {t("MODELS.TABLE.OFF", { pct: row.pct })}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
