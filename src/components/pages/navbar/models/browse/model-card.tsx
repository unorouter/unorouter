"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { ModelTypeBadge } from "@/components/elements/model/model-type-badge";
import { PerfBadge } from "@/components/elements/model/perf-badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ProcessedModel } from "@/lib/api/pricing";
import { getVendorTheme } from "@/lib/config/vendor-themes";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/utils/format/number";
import type { ModelSummary } from "@/openapi";

import { CapabilityChips } from "../detail/capability-chips";
import { ModelActionIcons, type ModelPricingLabels } from "./model-actions";

export function ModelCard(props: {
  model: ProcessedModel;
  onClick: () => void;
  labels: ModelPricingLabels;
  perf?: ModelSummary;
}) {
  const model = props.model;
  const theme = getVendorTheme(model.vendor.name);

  return (
    <div
      onClick={props.onClick}
      className={cn(
        "flex cursor-pointer flex-col overflow-hidden rounded-lg border p-5 transition-all",
        theme.bg,
        theme.border,
        "hover:border-opacity-50",
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <VendorIcon vendor={model.vendor.name} size={20} />
          <div className="min-w-0">
            <Tooltip>
              <TooltipTrigger
                render={
                  <h2 className="block truncate text-left font-mono text-sm font-medium tracking-wide" />
                }
              >
                {model.name}
              </TooltipTrigger>
              <TooltipContent>{model.name}</TooltipContent>
            </Tooltip>
            <div className="flex items-center gap-1.5">
              <p className="text-muted-foreground truncate font-mono text-[10px] tracking-wider uppercase">
                {model.vendor.name}
              </p>
              <ModelActionIcons model={model} iconSize="h-2.5 w-2.5" />
            </div>
          </div>
        </div>
        <ModelTypeBadge type={model.type} theme={theme} />
      </div>

      <div className="mt-auto pt-3">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          {model.isFixedPrice ? (
            <>
              <span className="text-muted-foreground font-mono text-[10px] italic">
                {props.labels.from}
              </span>
              <span
                className={cn("font-mono text-sm font-semibold", theme.text)}
              >
                {formatPrice(model.fixedPrice)}
              </span>
              <span className="text-muted-foreground font-mono text-[10px]">
                {props.labels.perRequest}
              </span>
            </>
          ) : (
            <>
              <span className="text-muted-foreground font-mono text-[10px] italic">
                {props.labels.from}
              </span>
              <span className="text-muted-foreground font-mono text-[10px] uppercase">
                {props.labels.input}{" "}
              </span>
              <span
                className={cn("font-mono text-sm font-semibold", theme.text)}
              >
                {formatPrice(model.inputPrice)}
              </span>
              <span className="text-muted-foreground font-mono text-[10px] uppercase">
                {props.labels.output}{" "}
              </span>
              <span
                className={cn("font-mono text-sm font-semibold", theme.text)}
              >
                {formatPrice(model.outputPrice)}
              </span>
              <span className="text-muted-foreground font-mono text-[10px]">
                {props.labels.perMillion}
              </span>
              {!model.isTiered &&
                model.originalInputPrice !== null &&
                model.originalOutputPrice !== null && (
                  <span className="text-muted-foreground w-full font-mono text-[10px] line-through">
                    {formatPrice(model.originalInputPrice)}/
                    {formatPrice(model.originalOutputPrice)}{" "}
                    {props.labels.perMillion}
                  </span>
                )}
            </>
          )}
          {model.gridPricing && (
            <span className="ml-auto shrink-0 rounded bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[10px] text-cyan-400">
              {props.labels.gridPricing}
            </span>
          )}
          {model.quotaType === 3 && (
            <span className="ml-auto shrink-0 rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-700 dark:text-amber-400">
              {props.labels.customBilling}
            </span>
          )}
          {model.isTiered && (
            <span className="ml-auto shrink-0 rounded bg-violet-500/10 px-1.5 py-0.5 font-mono text-[10px] text-violet-700 dark:text-violet-400">
              {props.labels.tiered}
            </span>
          )}
          {props.perf && (
            <PerfBadge perf={props.perf} compact className="ml-auto" />
          )}
        </div>
        <CapabilityChips
          metadata={model.metadata}
          limit={5}
          variant="card"
          className="mt-2"
        />
      </div>
    </div>
  );
}
