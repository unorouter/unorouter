"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { Icon } from "@/components/ui/icon";
import { modelReleaseTs } from "@/hooks/ui/use-models-hook";
import {
  deriveOutputModality,
  modelPriceColumns,
  inputPriceUnit,
  isFlatVariant,
  outputPriceUnit,
  fmtUnit,
  type PriceUnit,
} from "@/lib/api/model-modality";
import type { ProcessedModel } from "@/lib/api/pricing";
import type { RankedModel } from "@/lib/api/typebox/rankings";
import { getVendorTheme } from "@/lib/config/vendor-registry";
import { cn } from "@/lib/utils";
import { formatMsDate } from "@/lib/utils/format/date";
import {
  discountPercent,
  formatTokenCount,
  formatTokens,
} from "@/lib/utils/format/number";
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
      <span>
        {fmtUnit(props.value, props.unit, props.perCall)} {props.label}
      </span>
      {pct > 0 && (
        <>
          {props.original !== null && (
            <span className="text-muted-foreground/50 line-through">
              {fmtUnit(props.original, props.unit, props.perCall)}
            </span>
          )}
          <span className="rounded bg-green-500/15 px-1 text-green-600 dark:text-green-400">
            {props.offLabel(pct)}
          </span>
        </>
      )}
    </span>
  );
}

export function ModelListCard(props: {
  model: ProcessedModel;
  rank?: RankedModel;
  onClick: () => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const model = props.model;
  const theme = getVendorTheme(model.vendor.name);
  const modality = deriveOutputModality(model);
  const price = modelPriceColumns(model);
  const ctx = model.metadata.contextWindow ?? model.metadata.maxInputTokens;
  const releaseTs = modelReleaseTs(model);
  const offLabel = (pct: number) => t("MODELS.TABLE.OFF", { pct });
  const category = model.tags.find(
    (tag) =>
      !["text", "image", "video", "audio", "embedding"].includes(
        tag.toLowerCase(),
      ),
  );

  return (
    <button
      type="button"
      onClick={props.onClick}
      className="border-border/60 hover:bg-muted/30 w-full border-b px-2 py-5 text-left transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <VendorIcon vendor={model.vendor.name} size={22} />
          <span className="truncate text-lg font-medium">{model.name}</span>
          <span
            className={cn(
              "shrink-0 rounded px-1 py-0.5 font-mono text-[10px] uppercase",
              theme.tagBg,
              theme.text,
            )}
          >
            {model.type.charAt(0)}
          </span>
          {model.isFree && (
            <Icon
              name="gift"
              className="h-4 w-4 shrink-0 text-emerald-500"
              aria-label={t("MODELS.TABLE.FREE")}
            />
          )}
          {isFlatVariant(model) && (
            <span
              className="text-muted-foreground/70 flex shrink-0 items-center"
              aria-label={t("MODELS.TABLE.FLAT_NO_PARAMS")}
              title={t("MODELS.TABLE.FLAT_NO_PARAMS")}
            >
              <Icon name="circle-help" className="h-4 w-4" />
            </span>
          )}
        </div>
        {props.rank && (
          <span className="text-muted-foreground shrink-0 font-mono text-sm">
            {formatTokens(props.rank.total_tokens, locale)}{" "}
            {t("MODELS.LIST.TOKENS")}
          </span>
        )}
      </div>

      {category && (
        <span className="text-muted-foreground mt-2 inline-flex items-center gap-1 font-mono text-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
          {category}
        </span>
      )}

      {model.description && (
        <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">
          {model.description}
        </p>
      )}

      <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs">
        <span>
          {t("MODELS.LIST.BY")} {model.vendor.name}
        </span>
        {releaseTs > 0 && <span>{formatMsDate(releaseTs)}</span>}
        {ctx ? (
          <span>
            {formatTokenCount(ctx, locale)} {t("MODELS.LIST.CONTEXT")}
          </span>
        ) : null}
        <PriceMeta
          value={price.input}
          original={price.originalInput}
          unit={inputPriceUnit(modality, model.isFixedPrice)}
          label={model.isFixedPrice ? "" : t("MODELS.LIST.INPUT")}
          perCall={model.isFixedPrice}
          offLabel={offLabel}
        />
        <PriceMeta
          value={price.output}
          original={price.originalOutput}
          unit={outputPriceUnit(modality, model.isFixedPrice)}
          label={model.isFixedPrice ? "" : t("MODELS.LIST.OUTPUT")}
          perCall={model.isFixedPrice}
          offLabel={offLabel}
        />
      </div>
    </button>
  );
}
