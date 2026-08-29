"use client";

import {
  deriveOutputModality,
  fmtUnit,
  inputPriceUnit,
  modelPriceColumns,
  outputPriceUnit,
  type PriceUnit,
} from "@/lib/api/model-modality";
import { discountPercent } from "@/lib/utils/format/number";
import type { PricingCatalogModel } from "@/openapi";
import { useTranslations } from "next-intl";

function PriceMeta(props: {
  value: number;
  original: number | null;
  unit: PriceUnit;
  label: string;
  offLabel: (pct: number) => string;
  perCall?: boolean;
  emphasis?: boolean;
}) {
  if (props.unit === "dash" || props.value <= 0) return null;
  const pct = discountPercent(props.value, props.original);
  return (
    <span className="flex items-center gap-1">
      {props.emphasis ? (
        <>
          <span className="text-foreground font-medium">
            {fmtUnit(props.value, props.unit, props.perCall)}
          </span>
          <span className="text-muted-foreground">{props.label}</span>
        </>
      ) : (
        <span>
          {fmtUnit(props.value, props.unit, props.perCall)} {props.label}
        </span>
      )}
      {pct > 0 && props.original !== null && (
        <>
          <span className="text-muted-foreground/50 line-through">
            {fmtUnit(props.original, props.unit, props.perCall)}
          </span>
          <span className="rounded bg-green-500/15 px-1 text-green-600 dark:text-green-400">
            {props.offLabel(pct)}
          </span>
        </>
      )}
    </span>
  );
}

export function ModelPriceMetas(props: {
  model: PricingCatalogModel;
  emphasis?: boolean;
}) {
  const t = useTranslations();
  const model = props.model;
  const modality = deriveOutputModality(model);
  const price = modelPriceColumns(model);
  const offLabel = (pct: number) => t("MODELS.TABLE.OFF", { pct });
  return (
    <>
      <PriceMeta
        value={price.input}
        original={price.originalInput}
        unit={inputPriceUnit(modality, model.is_fixed_price)}
        label={model.is_fixed_price ? "" : t("MODELS.LIST.INPUT")}
        perCall={model.is_fixed_price}
        offLabel={offLabel}
        emphasis={props.emphasis}
      />
      <PriceMeta
        value={price.output}
        original={price.originalOutput}
        unit={outputPriceUnit(modality, model.is_fixed_price)}
        label={model.is_fixed_price ? "" : t("MODELS.LIST.OUTPUT")}
        perCall={model.is_fixed_price}
        offLabel={offLabel}
        emphasis={props.emphasis}
      />
    </>
  );
}
