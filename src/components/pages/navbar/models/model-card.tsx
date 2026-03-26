"use client";

import { VendorIcon } from "@/components/elements/vendor-icon";
import { Badge } from "@/components/ui/badge";
import type { ProcessedModel } from "@/lib/api/pricing";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/utils/base";
import { getVendorTheme } from "@/lib/vendor-themes";

export type ModelCardLabels = {
  from: string;
  perRequest: string;
  input: string;
  output: string;
  perMillion: string;
  gridPricing: string;
  customBilling: string;
};

export function ModelCard(props: {
  model: ProcessedModel;
  onClick: () => void;
  labels: ModelCardLabels;
}) {
  const model = props.model;
  const theme = getVendorTheme(model.vendor.name);

  return (
    <div
      onClick={props.onClick}
      className={cn(
        "flex cursor-pointer flex-col rounded-lg border p-5 transition-all",
        theme.bg,
        theme.border,
        "hover:border-opacity-50",
      )}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <VendorIcon vendor={model.vendor.name} size={20} />
          <div>
            <h3 className="font-mono text-sm font-medium tracking-wide">
              {model.name}
            </h3>
            <p className="text-muted-foreground font-mono text-[10px] tracking-wider uppercase">
              {model.vendor.name}
            </p>
          </div>
        </div>
        <Badge
          variant="secondary"
          className={cn(
            "font-mono text-[10px] uppercase",
            model.type === "text" && `${theme.tagBg} ${theme.text}`,
            model.type === "image" &&
              "border-green-500/30 bg-green-500/10 text-green-400",
            model.type === "video" &&
              "border-purple-500/30 bg-purple-500/10 text-purple-400",
            model.type === "audio" &&
              "border-amber-500/30 bg-amber-500/10 text-amber-400",
            model.type === "embedding" &&
              "border-sky-500/30 bg-sky-500/10 text-sky-400",
          )}
        >
          {model.type}
        </Badge>
      </div>

      <div className="mt-auto pt-3">
        <div className="flex items-baseline gap-2">
          {model.isFixedPrice ? (
            <>
              <span className="text-muted-foreground/60 font-mono text-[10px] italic">
                {props.labels.from}
              </span>
              <span className={cn("font-mono text-sm font-semibold", theme.text)}>
                {formatPrice(model.fixedPrice)}
              </span>
              <span className="text-muted-foreground font-mono text-[10px]">
                {props.labels.perRequest}
              </span>
            </>
          ) : (
            <>
              <span className="text-muted-foreground/60 font-mono text-[10px] italic">
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
            </>
          )}
          {model.gridPricing && (
            <span className="ml-auto shrink-0 rounded bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[10px] text-cyan-400">
              {props.labels.gridPricing}
            </span>
          )}
          {model.quotaType === 3 && (
            <span className="ml-auto shrink-0 rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-400">
              {props.labels.customBilling}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
