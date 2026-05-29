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

export type ModelListItemLabels = {
  from: string;
  perRequest: string;
  input: string;
  output: string;
  perMillion: string;
  gridPricing: string;
  customBilling: string;
  tiered: string;
};

export function ModelListItem(props: {
  model: ProcessedModel;
  onClick: () => void;
  labels: ModelListItemLabels;
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
        "hover:bg-muted/50 flex cursor-pointer flex-col gap-2 rounded-lg border px-4 py-3 transition-all sm:flex-row sm:items-center sm:gap-4",
        theme.border,
      )}
    >
      {/* Row 1: Icon + Name + Badge */}
      <div className="flex items-center gap-3 sm:min-w-0 sm:flex-1">
        <VendorIcon
          vendor={model.vendor.name}
          model={model.name}
          size={18}
        />

        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <span className="truncate font-mono text-sm font-medium tracking-wide">
            {model.name}
          </span>
          <Tooltip>
            <TooltipTrigger render={<span className="shrink-0" />}>
              <CopyButton
                text={model.name}
                iconSize="h-3 w-3"
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
              <Icon name="message-square" className="h-3 w-3" />
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
              <Icon name="external-link" className="h-3 w-3" />
            </TooltipTrigger>
            <TooltipContent>{t("MODELS.VIEW_DETAILS")}</TooltipContent>
          </Tooltip>
        </div>

        <ModelTypeBadge
          type={model.type}
          theme={theme}
          className="shrink-0 sm:hidden"
        />
      </div>

      {/* Desktop only: vendor + badge */}
      <span className="text-muted-foreground hidden font-mono text-[10px] tracking-wider uppercase sm:inline">
        {model.vendor.name}
      </span>

      <ModelTypeBadge
        type={model.type}
        theme={theme}
        className="hidden sm:inline-flex"
      />

      <CapabilityChips
        metadata={model.metadata}
        limit={3}
        variant="card"
        className="hidden md:flex"
      />

      {props.perf && <PerfBadge perf={props.perf} className="hidden lg:flex" />}

      {/* Row 2: Pricing */}
      <div className="flex shrink-0 items-center gap-2 text-right">
        {model.gridPricing && (
          <span className="hidden rounded bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[10px] text-cyan-400 sm:inline">
            {props.labels.gridPricing}
          </span>
        )}
        {model.quotaType === 3 && (
          <span className="rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-400">
            {props.labels.customBilling}
          </span>
        )}
        {model.isTiered && (
          <span className="rounded bg-violet-500/10 px-1.5 py-0.5 font-mono text-[10px] text-violet-400">
            {props.labels.tiered}
          </span>
        )}
        <div className="flex items-baseline gap-1">
          {model.isFixedPrice ? (
            <>
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
            <div className="flex items-baseline gap-2 sm:gap-3">
              {model.isTiered && (
                <span className="text-muted-foreground font-mono text-[10px] italic">
                  {props.labels.from}
                </span>
              )}
              <div>
                <span className="text-muted-foreground font-mono text-[10px] uppercase">
                  {props.labels.input}{" "}
                </span>
                <span
                  className={cn(
                    "font-mono text-xs font-semibold sm:text-sm",
                    theme.text,
                  )}
                >
                  {formatPrice(model.inputPrice)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground font-mono text-[10px] uppercase">
                  {props.labels.output}{" "}
                </span>
                <span
                  className={cn(
                    "font-mono text-xs font-semibold sm:text-sm",
                    theme.text,
                  )}
                >
                  {formatPrice(model.outputPrice)}
                </span>
              </div>
              <span className="text-muted-foreground font-mono text-[10px] sm:hidden md:inline">
                {props.labels.perMillion}
              </span>
              {model.originalInputPrice !== null &&
                model.originalOutputPrice !== null && (
                  <span className="text-muted-foreground font-mono text-[10px] line-through sm:hidden md:inline">
                    {formatPrice(model.originalInputPrice)}/
                    {formatPrice(model.originalOutputPrice)}
                  </span>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
