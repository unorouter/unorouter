"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { CopyButton } from "@/components/elements/code/copy-button";
import { ModelTypeBadge } from "@/components/elements/model/model-type-badge";
import { PerfBadge } from "@/components/elements/model/perf-badge";
import { Icon } from "@/components/ui/icon";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Link, useRouter } from "@/i18n/navigation";
import type { ModelSummary } from "@/openapi";
import type { ProcessedModel } from "@/lib/api/pricing";
import { getVendorTheme } from "@/lib/config/vendor-themes";
import { cn } from "@/lib/utils";
import { modelSlug } from "@/lib/utils/base";
import { formatPrice } from "@/lib/utils/format/number";
import { chatModelAtom } from "@/store/chat-store";
import { useSetAtom } from "jotai";
import { useTranslations } from "next-intl";

import { CapabilityChips } from "../detail/capability-chips";

export type ModelCardLabels = {
  from: string;
  perRequest: string;
  input: string;
  output: string;
  perMillion: string;
  gridPricing: string;
  customBilling: string;
  tiered: string;
};

export function ModelCard(props: {
  model: ProcessedModel;
  onClick: () => void;
  labels: ModelCardLabels;
  perf?: ModelSummary;
}) {
  const t = useTranslations();
  const router = useRouter();
  const setChatModel = useSetAtom(chatModelAtom);
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
              <Tooltip>
                <TooltipTrigger render={<span className="shrink-0" />}>
                  <CopyButton
                    text={model.name}
                    iconSize="h-2.5 w-2.5"
                    className="text-muted-foreground hover:text-foreground flex size-6 shrink-0 items-center justify-center transition-colors"
                  />
                </TooltipTrigger>
                <TooltipContent>{t("COMMON.COPY_CODE")}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  aria-label={t("MODELS.OPEN_IN_CHAT")}
                  className="text-muted-foreground hover:text-foreground flex size-6 shrink-0 items-center justify-center transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setChatModel(model.name);
                    router.push("/chat");
                  }}
                >
                  <Icon name="message-square" className="h-2.5 w-2.5" />
                </TooltipTrigger>
                <TooltipContent>{t("MODELS.OPEN_IN_CHAT")}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  aria-label={t("MODELS.VIEW_DETAILS")}
                  className="text-muted-foreground hover:text-foreground flex size-6 shrink-0 items-center justify-center transition-colors"
                  onClick={(e) => e.stopPropagation()}
                  render={
                    <Link
                      href={{
                        pathname: "/models/[slug]",
                        params: { slug: modelSlug(model.name) },
                      }}
                    />
                  }
                >
                  <Icon name="external-link" className="h-2.5 w-2.5" />
                </TooltipTrigger>
                <TooltipContent>{t("MODELS.VIEW_DETAILS")}</TooltipContent>
              </Tooltip>
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
          ) : model.isTiered ? (
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
              {model.originalInputPrice !== null &&
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
            <span className="ml-auto shrink-0 rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-400">
              {props.labels.customBilling}
            </span>
          )}
          {model.isTiered && (
            <span className="ml-auto shrink-0 rounded bg-violet-500/10 px-1.5 py-0.5 font-mono text-[10px] text-violet-400">
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
