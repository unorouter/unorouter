"use client";

import type { PricingCatalogDetail } from "@/openapi";
import type { ReactNode } from "react";
import { TranslationKey } from "@/lib/config/constants";
import { getVendorTheme } from "@/lib/config/vendor-registry";
import { cn } from "@/lib/utils";
import { discountPercent, formatPrice } from "@/lib/utils/format/number";
import { useTranslations } from "next-intl";
import { FixedPriceUnit } from "../shared/fixed-price-unit";
import { MINI_TABLE, MINI_TABLE_BODY_ROW } from "../shared/mini-table";

type Row = {
  labelKey: TranslationKey;
  price: number;
  unit: ReactNode;
  pct: number;
};

function buildRows(model: PricingCatalogDetail): Row[] {
  if (model.is_fixed_price) {
    return [
      {
        labelKey: "MODELS.DETAIL.PRICING",
        price: model.fixed_price,
        unit: <FixedPriceUnit model={model} />,
        pct: discountPercent(
          model.fixed_price,
          model.original_fixed_price ?? null,
        ),
      },
    ];
  }
  // One badge for both directions: input and output are discounted off the
  // same canonical list, so the deeper cut is the honest headline.
  const pct = Math.max(
    discountPercent(model.input_price, model.original_input_price ?? null),
    discountPercent(model.output_price, model.original_output_price ?? null),
  );
  const rows: Row[] = [
    {
      labelKey: "MODELS.PRICE.INPUT",
      price: model.input_price,
      unit: null,
      pct,
    },
    {
      labelKey: "MODELS.PRICE.OUTPUT",
      price: model.output_price,
      unit: null,
      pct: 0,
    },
  ];
  if (model.create_cache_ratio != null && model.create_cache_ratio > 0)
    rows.push({
      labelKey: "MODELS.PRICE.CACHE_WRITE",
      price: model.input_price * model.create_cache_ratio,
      unit: null,
      pct: 0,
    });
  if (model.cache_ratio != null && model.cache_ratio > 0)
    rows.push({
      labelKey: "MODELS.PRICE.CACHE_READ",
      price: model.input_price * model.cache_ratio,
      unit: null,
      pct: 0,
    });
  return rows;
}

export function PriceRows(props: {
  model: PricingCatalogDetail;
  theme: ReturnType<typeof getVendorTheme>;
}) {
  const t = useTranslations();
  const rows = buildRows(props.model);
  const perMillion = !props.model.is_fixed_price;

  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-1",
        props.theme.bg,
        props.theme.border,
      )}
    >
      <table className={MINI_TABLE}>
        <tbody>
          {rows.map((row) => (
            <tr key={row.labelKey} className={MINI_TABLE_BODY_ROW}>
              <td className="text-muted-foreground py-1.5 pr-3 text-[10px] uppercase">
                {t(row.labelKey)}
              </td>
              <td
                className={cn(
                  "py-1.5 text-right font-medium whitespace-nowrap",
                  props.theme.text,
                )}
              >
                {formatPrice(row.price)}
                <span className="text-muted-foreground ml-0.5 text-[10px]">
                  {perMillion ? t("MODELS.PRICE.PER_MILLION") : row.unit}
                </span>
              </td>
              <td className="w-0 py-1.5 pl-2 text-right">
                {row.pct > 0 && (
                  <span className="rounded bg-green-500/15 px-1 text-[10px] whitespace-nowrap text-green-600 dark:text-green-400">
                    {t("MODELS.TABLE.OFF", { pct: row.pct })}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
