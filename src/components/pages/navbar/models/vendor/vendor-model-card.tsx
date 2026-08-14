"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { Link } from "@/i18n/navigation";
import { modelReleaseTs, NEW_MODEL_MS } from "@/hooks/ui/use-models-hook";
import { useState } from "react";
import {
  deriveOutputModality,
  inputPriceUnit,
  outputPriceUnit,
  fmtUnit,
  type PriceUnit,
} from "@/lib/api/model-modality";
import type { ProcessedModel } from "@/lib/api/pricing";
import { getVendorTheme } from "@/lib/config/vendor-registry";
import { cn } from "@/lib/utils";
import { modelHref } from "@/lib/utils/base";
import { discountPercent, formatTokenCount } from "@/lib/utils/format/number";
import { CapabilityChips } from "../detail/header/capability-chips";
import { useLocale, useTranslations } from "next-intl";

function PriceMeta(props: {
  value: number;
  original: number | null;
  unit: PriceUnit;
  label: string;
  offLabel: (pct: number) => string;
  perCall?: boolean;
}) {
  if (props.unit === "dash" || props.value <= 0) return null;
  const pct = discountPercent(props.value, props.original);
  return (
    <span className="flex items-center gap-1">
      <span className="text-foreground font-medium">
        {fmtUnit(props.value, props.unit, props.perCall)}
      </span>
      <span className="text-muted-foreground">{props.label}</span>
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

export function VendorModelCard(props: { model: ProcessedModel }) {
  const t = useTranslations();
  const locale = useLocale();
  const model = props.model;
  const theme = getVendorTheme(model.vendor.name);
  const modality = deriveOutputModality(model);
  const fixedOnOutput = modality === "image" || modality === "video";
  const input = model.isFixedPrice
    ? fixedOnOutput
      ? 0
      : model.fixedPrice
    : model.inputPrice;
  const output = model.isFixedPrice
    ? fixedOnOutput
      ? model.fixedPrice
      : 0
    : model.outputPrice;
  const originalInput = model.isFixedPrice
    ? fixedOnOutput
      ? null
      : model.originalFixedPrice
    : model.originalInputPrice;
  const originalOutput = model.isFixedPrice
    ? fixedOnOutput
      ? model.originalFixedPrice
      : null
    : model.originalOutputPrice;
  const ctx = model.metadata.contextWindow ?? model.metadata.maxInputTokens;
  const releaseTs = modelReleaseTs(model);
  const [now] = useState(() => Date.now());
  const isNew = releaseTs > 0 && now - releaseTs < NEW_MODEL_MS;
  const isDeprecated = Boolean(model.metadata.deprecationDate);
  const offLabel = (pct: number) => t("MODELS.TABLE.OFF", { pct });

  return (
    <Link
      href={modelHref(model.name, model.vendor.name)}
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-4 transition-all hover:-translate-y-0.5",
        theme.bg,
        theme.border,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <VendorIcon vendor={model.vendor.name} size={18} />
          <span
            className={cn(
              "truncate font-mono text-[11px] uppercase",
              theme.text,
            )}
          >
            {model.vendor.name}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {model.isFree && (
            <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[10px] text-emerald-700 dark:text-emerald-400">
              {t("MODELS.TABLE.FREE")}
            </span>
          )}
          {isNew && (
            <span className="rounded bg-orange-500/15 px-1.5 py-0.5 font-mono text-[10px] text-orange-600 dark:text-orange-400">
              {t("MODELS.VENDOR.NEW")}
            </span>
          )}
          {isDeprecated && (
            <span className="text-muted-foreground rounded bg-zinc-500/15 px-1.5 py-0.5 font-mono text-[10px]">
              {t("MODELS.VENDOR.DEPRECATED")}
            </span>
          )}
        </div>
      </div>

      <div className="truncate text-base font-medium">{model.name}</div>

      {model.description && (
        <p className="text-muted-foreground line-clamp-2 text-sm">
          {model.description}
        </p>
      )}

      <CapabilityChips metadata={model.metadata} variant="card" limit={4} />

      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs">
        {ctx ? (
          <span className="text-muted-foreground">
            {formatTokenCount(ctx, locale)}
          </span>
        ) : null}
        <PriceMeta
          value={input}
          original={originalInput}
          unit={inputPriceUnit(modality, model.isFixedPrice)}
          label={model.isFixedPrice ? "" : t("MODELS.LIST.INPUT")}
          perCall={model.isFixedPrice}
          offLabel={offLabel}
        />
        <PriceMeta
          value={output}
          original={originalOutput}
          unit={outputPriceUnit(modality, model.isFixedPrice)}
          label={model.isFixedPrice ? "" : t("MODELS.LIST.OUTPUT")}
          perCall={model.isFixedPrice}
          offLabel={offLabel}
        />
      </div>
    </Link>
  );
}
