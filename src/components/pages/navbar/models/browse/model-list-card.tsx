"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { Icon } from "@/components/ui/icon";
import { modelReleaseTs } from "@/hooks/ui/use-models-hook";
import {
  deriveOutputModality,
  inputPriceUnit,
  outputPriceUnit,
  type PriceUnit,
} from "@/lib/api/model-modality";
import type { ProcessedModel } from "@/lib/api/pricing";
import type { RankedModel } from "@/lib/api/typebox/rankings";
import { getVendorTheme } from "@/lib/config/vendor-themes";
import { cn } from "@/lib/utils";
import { formatLongDate } from "@/lib/utils/format/date";
import {
  discountPercent,
  formatPrice,
  formatTokenCount,
  formatTokens,
} from "@/lib/utils/format/number";
import { useTranslations } from "next-intl";

function fmtUnit(value: number, unit: PriceUnit): string {
  if (unit === "dash" || value <= 0) return "-";
  if (unit === "perImage") return `${formatPrice(value)}/img`;
  return formatPrice(value);
}

function PriceMeta(props: {
  value: number;
  original: number | null;
  unit: PriceUnit;
  label: string;
  offLabel: (pct: number) => string;
}) {
  if (props.unit === "dash" || props.value <= 0) return null;
  const pct = discountPercent(props.value, props.original);
  return (
    <span className="flex items-center gap-1">
      <span>
        {fmtUnit(props.value, props.unit)} {props.label}
      </span>
      {pct > 0 && (
        <>
          {props.original !== null && (
            <span className="text-muted-foreground/50 line-through">
              {fmtUnit(props.original, props.unit)}
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
  const model = props.model;
  const theme = getVendorTheme(model.vendor.name);
  const modality = deriveOutputModality(model);
  const input = model.isFixedPrice ? model.fixedPrice : model.inputPrice;
  const output = model.isFixedPrice ? model.fixedPrice : model.outputPrice;
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
        </div>
        {props.rank && (
          <span className="text-muted-foreground shrink-0 font-mono text-sm">
            {formatTokens(props.rank.total_tokens)} {t("MODELS.LIST.TOKENS")}
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
        {releaseTs > 0 && <span>{formatLongDate(releaseTs)}</span>}
        {ctx ? (
          <span>
            {formatTokenCount(ctx)} {t("MODELS.LIST.CONTEXT")}
          </span>
        ) : null}
        <PriceMeta
          value={input}
          original={model.originalInputPrice}
          unit={inputPriceUnit(modality)}
          label={t("MODELS.LIST.INPUT")}
          offLabel={offLabel}
        />
        <PriceMeta
          value={output}
          original={model.originalOutputPrice}
          unit={outputPriceUnit(modality)}
          label={t("MODELS.LIST.OUTPUT")}
          offLabel={offLabel}
        />
      </div>
    </button>
  );
}
