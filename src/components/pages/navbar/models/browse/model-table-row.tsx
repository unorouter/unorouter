"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { Icon } from "@/components/ui/icon";
import {
  deriveOutputModality,
  inputPriceUnit,
  outputPriceUnit,
  type PriceUnit,
} from "@/lib/api/model-modality";
import type { ProcessedModel } from "@/lib/api/pricing";
import type { RankedModel } from "@/lib/api/typebox/rankings";
import { modelReleaseTs } from "@/hooks/ui/use-models-hook";
import { cn } from "@/lib/utils";
import { formatLongDate } from "@/lib/utils/format/date";
import {
  discountPercent,
  formatPrice,
  formatTokenCount,
  formatTokens,
} from "@/lib/utils/format/number";
import { useTranslations } from "next-intl";
import { MODEL_TABLE_COLS } from "./model-table-header";

function fmtUnit(value: number, unit: PriceUnit): string {
  if (unit === "dash" || value <= 0) return "-";
  if (unit === "perImage") return `${formatPrice(value)}/img`;
  return formatPrice(value);
}

function PriceCell(props: {
  value: number;
  original: number | null;
  unit: PriceUnit;
  offLabel: (pct: number) => string;
}) {
  if (props.unit === "dash" || props.value <= 0) {
    return (
      <span className="text-muted-foreground text-right font-mono text-sm">
        {fmtUnit(props.value, props.unit)}
      </span>
    );
  }
  const pct = discountPercent(props.value, props.original);
  return (
    <span className="flex flex-col items-end font-mono text-sm">
      <span>{fmtUnit(props.value, props.unit)}</span>
      {pct > 0 && (
        <span className="flex flex-col items-end gap-0.5 text-[10px] lg:flex-row lg:items-center lg:gap-1">
          <span className="text-muted-foreground/60 line-through">
            {props.original !== null ? fmtUnit(props.original, props.unit) : ""}
          </span>
          <span className="rounded bg-green-500/15 px-1 text-green-600 dark:text-green-400">
            {props.offLabel(pct)}
          </span>
        </span>
      )}
    </span>
  );
}

export function ModelTableRow(props: {
  model: ProcessedModel;
  rank?: RankedModel;
  onClick: () => void;
}) {
  const t = useTranslations();
  const model = props.model;
  const modality = deriveOutputModality(model);
  const input = model.isFixedPrice ? model.fixedPrice : model.inputPrice;
  const output = model.isFixedPrice ? model.fixedPrice : model.outputPrice;
  const ctx = model.metadata.contextWindow ?? model.metadata.maxInputTokens;
  const releaseTs = modelReleaseTs(model);
  const offLabel = (pct: number) => t("MODELS.TABLE.OFF", { pct });

  return (
    <button
      type="button"
      onClick={props.onClick}
      className={cn(
        MODEL_TABLE_COLS,
        "border-border/50 hover:bg-muted/40 w-full border-b px-1 py-3 text-left transition-colors lg:px-3",
      )}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <VendorIcon vendor={model.vendor.name} size={18} />
        <span className="truncate font-mono text-xs lg:text-sm">
          {model.name}
        </span>
        {model.isFree && (
          <span className="flex shrink-0 items-center gap-0.5 rounded bg-emerald-500/15 px-1 py-0.5 font-mono text-[10px] text-emerald-600 lg:px-1.5 dark:text-emerald-400">
            <Icon name="gift" className="h-3 w-3" />
            <span className="hidden lg:inline">{t("MODELS.TABLE.FREE")}</span>
          </span>
        )}
      </span>
      <span className="text-muted-foreground hidden text-right font-mono text-sm lg:block">
        {props.rank ? formatTokens(props.rank.total_tokens) : "-"}
      </span>
      <PriceCell
        value={input}
        original={model.originalInputPrice}
        unit={inputPriceUnit(modality)}
        offLabel={offLabel}
      />
      <PriceCell
        value={output}
        original={model.originalOutputPrice}
        unit={outputPriceUnit(modality)}
        offLabel={offLabel}
      />
      <span className="text-muted-foreground text-right font-mono text-sm">
        {formatTokenCount(ctx)}
      </span>
      <span className="text-muted-foreground hidden text-right font-mono text-sm lg:block">
        {releaseTs > 0 ? formatLongDate(releaseTs) : "-"}
      </span>
    </button>
  );
}
