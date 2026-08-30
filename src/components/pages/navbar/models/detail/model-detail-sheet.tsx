"use client";

import { EMPTY_METADATA } from "@/lib/api/model-modality";
import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { Icon } from "@/components/ui/icon";
import { CopyButton } from "@/components/elements/code/copy-button";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Link } from "@/i18n/navigation";
import { analytics } from "@/lib/analytics";
import { modelHref } from "@/lib/utils/base";
import { chatModelAtom } from "@/store/chat-store";
import { useSetAtom } from "jotai";
import {
  buildGroupEntries,
  type GroupEntry,
  gridPriceParts,
  gridPricingColumns,
  type EndpointInfo,
  GridPricingRow,
} from "@/lib/api/pricing";
import type { PricingCatalogDetail } from "@/openapi";
import { useModelWatch } from "@/hooks/models/notify-hook";
import {
  useModelDetailQuery,
  useModelGroupsQuery,
} from "@/hooks/models/pricing-hook";
import { FixedPriceUnit } from "./shared/fixed-price-unit";
import { SectionHeading } from "./shared/section-heading";
import { env } from "@/lib/config/env";
import { getVendorTheme } from "@/lib/config/vendor-registry";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/utils/format/number";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { MINI_TABLE, MINI_TABLE_BODY_ROW } from "./shared/mini-table";
import { CachePricing } from "./pricing/cache-pricing";
import { ModelDescription } from "./header/model-description";
import { AutoGroupChain } from "./pricing/auto-group-chain";
import { hasAnyParameter } from "./header/capability-helpers";
import { ModelHeaderChips, ModelMetaStats } from "./header/model-header-chips";
import { PerformanceSection } from "./tabs/performance-section";
import { UptimeSection } from "./tabs/uptime-section";
import { SupportedParameters } from "./tabs/supported-parameters";

type ModelDetailSheetProps = {
  model: { model_name: string } | null;
  endpointMap: Record<string, EndpointInfo>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function WatchButton(props: { modelName: string }) {
  const t = useTranslations();
  const watch = useModelWatch(props.modelName);

  return (
    <Button
      size="sm"
      variant="outline"
      className={cn(
        "flex-1",
        watch.watched && "border-primary/40 text-primary",
      )}
      onClick={() => watch.toggle()}
    >
      <Icon name="bell" className="mr-2 h-3.5 w-3.5" />
      {watch.watched ? t("NOTIFY.UNWATCH") : t("NOTIFY.WATCH")}
    </Button>
  );
}

export function ModelDetailSheet(props: ModelDetailSheetProps) {
  const t = useTranslations();
  const locale = useLocale();
  const setChatModel = useSetAtom(chatModelAtom);
  const detailQuery = useModelDetailQuery(props.model?.model_name ?? null);
  const detail = detailQuery.data;
  const model = detail && {
    ...detail,
    metadata: detail.metadata ?? EMPTY_METADATA,
  };
  const groupsQuery = useModelGroupsQuery(props.model?.model_name ?? null);

  if (!model) return null;

  const theme = getVendorTheme(model.vendor);

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto sm:max-w-2xl">
        <SheetHeader className="border-border border-b pb-4">
          <div className="flex items-center gap-3">
            <span
              className={`flex size-11 shrink-0 items-center justify-center rounded-lg border ${theme.bg} ${theme.border}`}
            >
              <VendorIcon vendor={model.vendor} size={28} />
            </span>
            <div className="min-w-0 flex-1">
              <SheetTitle className="flex items-center gap-2 font-mono text-base tracking-wide">
                <span className="truncate">{model.model_name}</span>
                <CopyButton
                  text={model.model_name}
                  analyticsLabel="model_name"
                />
              </SheetTitle>
              <SheetDescription
                className={`font-mono text-[10px] tracking-wider uppercase ${theme.text}`}
              >
                {model.vendor}
              </SheetDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              nativeButton={false}
              render={<Link href={modelHref(model.model_name, model.vendor)} />}
            >
              <Icon name="external-link" className="mr-2 h-3.5 w-3.5" />
              {t("MODELS.VIEW_DETAILS")}
            </Button>
            <Button
              size="sm"
              className="flex-1"
              nativeButton={false}
              onClick={() => {
                analytics.models.openInChat({ model: model.model_name });
                setChatModel(model.model_name);
              }}
              render={<Link href="/chat" />}
            >
              <Icon name="message-circle" className="mr-2 h-3.5 w-3.5" />
              {t("MODELS.OPEN_IN_CHAT")}
            </Button>
            <WatchButton modelName={model.model_name} />
          </div>
        </SheetHeader>

        <div className="space-y-6 p-4">
          <section>
            <SectionHeading theme={theme}>
              {t("MODELS.DETAIL.UPTIME")}
            </SectionHeading>
            <UptimeSection model={model.model_name} />
          </section>

          <section>
            <SectionHeading theme={theme}>
              {t("MODELS.DETAIL.PERFORMANCE")}
            </SectionHeading>
            <PerformanceSection modelName={model.model_name} />
          </section>

          {model.description && (
            <section>
              <SectionHeading theme={theme}>
                {t("MODELS.DETAIL.DESCRIPTION")}
              </SectionHeading>
              <ModelDescription text={model.description} />
            </section>
          )}

          <ModelHeaderChips metadata={model.metadata} locale={locale} />

          <ModelMetaStats metadata={model.metadata} />

          <section>
            <SectionHeading theme={theme}>
              {t("MODELS.DETAIL.PRICING")}
            </SectionHeading>
            <div
              className={cn("rounded-lg border p-4", theme.bg, theme.border)}
            >
              {model.is_fixed_price ? (
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span
                      className={cn("font-mono text-lg font-bold", theme.text)}
                    >
                      {formatPrice(model.fixed_price)}
                    </span>
                    <span className="text-muted-foreground font-mono text-xs">
                      <FixedPriceUnit model={model} />
                    </span>
                  </div>
                  {model.original_fixed_price !== null && (
                    <div className="text-muted-foreground/50 font-mono text-xs line-through">
                      {t("MODELS.PRICE.ORIGINAL")}:{" "}
                      {formatPrice(model.original_fixed_price ?? 0)}{" "}
                      <FixedPriceUnit model={model} />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-muted-foreground font-mono text-[10px] uppercase">
                        {t("MODELS.PRICE.INPUT")}
                      </span>
                      <div
                        className={cn(
                          "font-mono text-lg font-bold",
                          theme.text,
                        )}
                      >
                        {formatPrice(model.input_price)}
                      </div>
                      <span className="text-muted-foreground font-mono text-[10px]">
                        {t("MODELS.PRICE.PER_MILLION")}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground font-mono text-[10px] uppercase">
                        {t("MODELS.PRICE.OUTPUT")}
                      </span>
                      <div
                        className={cn(
                          "font-mono text-lg font-bold",
                          theme.text,
                        )}
                      >
                        {formatPrice(model.output_price)}
                      </div>
                      <span className="text-muted-foreground font-mono text-[10px]">
                        {t("MODELS.PRICE.PER_MILLION")}
                      </span>
                    </div>
                  </div>
                  {model.original_input_price !== null &&
                    model.original_output_price !== null && (
                      <div className="text-muted-foreground/50 font-mono text-xs line-through">
                        {t("MODELS.PRICE.ORIGINAL")}:{" "}
                        {formatPrice(model.original_input_price ?? 0)}/
                        {formatPrice(model.original_output_price ?? 0)}{" "}
                        {t("MODELS.PRICE.PER_MILLION")}
                      </div>
                    )}
                  <CachePricing model={model} theme={theme} />
                </div>
              )}
            </div>
          </section>

          {model.grid_pricing && (
            <GridPricingSection
              gridPricing={model.grid_pricing}
              priceMultiplier={model.grid_min_ratio}
              theme={theme}
            />
          )}

          {model.enable_groups.length > 0 && !model.is_tiered && (
            <GroupPricingSection
              model={model}
              groupRatioMap={groupsQuery.data?.group_ratio ?? {}}
              autoGroups={groupsQuery.data?.auto_chain ?? []}
              theme={theme}
            />
          )}

          {hasAnyParameter(model.metadata) && (
            <section>
              <SectionHeading theme={theme}>
                {t("MODELS.DETAIL.SUPPORTED_PARAMETERS")}
              </SectionHeading>
              <SupportedParameters metadata={model.metadata} />
            </section>
          )}

          {model.supported_endpoint_types.length > 0 && (
            <section>
              <SectionHeading theme={theme}>
                {t("MODELS.DETAIL.ENDPOINTS")}
              </SectionHeading>
              <div className="space-y-2">
                {model.supported_endpoint_types.map((endpoint) => {
                  const info = props.endpointMap[endpoint];
                  let path = info?.path ?? "";
                  if (path.includes("{model}")) {
                    path = path.replaceAll("{model}", model.model_name);
                  }
                  const method = info?.method ?? "POST";
                  const apiBase = env.apiUrl ?? "";
                  const fullUrl = path ? `${apiBase}${path}` : "";

                  return (
                    <div
                      key={endpoint}
                      className="border-border rounded border p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                          <span className="font-mono text-xs">{endpoint}</span>
                        </div>
                        {path && (
                          <span className="text-muted-foreground font-mono text-[10px] uppercase">
                            {method}
                          </span>
                        )}
                      </div>
                      {fullUrl && (
                        <div className="mt-1.5 flex items-start gap-1.5 pl-3.5">
                          <p className="text-muted-foreground font-mono text-[10px] break-all">
                            {fullUrl}
                          </p>
                          <CopyButton text={fullUrl} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <p className="text-muted-foreground/60 font-mono text-[10px] leading-relaxed italic">
            {t("MODELS.PRICE.VARIES_TOOLTIP")}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function GridPricingTable(props: {
  rows: GridPricingRow[];
  priceMultiplier?: number;
  theme: ReturnType<typeof getVendorTheme>;
  pricingLabel: string;
}) {
  const columns = gridPricingColumns(props.rows);

  return (
    <div className="overflow-x-auto">
      <table className={MINI_TABLE}>
        <thead>
          <tr className="border-border/40 border-b">
            {columns.map((col) => (
              <th
                key={col}
                className="text-foreground px-2 py-1.5 text-left text-[10px] font-normal uppercase"
              >
                {col}
              </th>
            ))}
            <th className="text-foreground px-2 py-1.5 text-right text-[10px] font-normal uppercase">
              {props.pricingLabel}
            </th>
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row, i) => {
            const { price, suffix } = gridPriceParts(
              row,
              props.priceMultiplier,
            );
            return (
              <tr key={i} className={MINI_TABLE_BODY_ROW}>
                {columns.map((col) => (
                  <td
                    key={col}
                    className="text-muted-foreground px-2 py-1.5 text-[11px]"
                  >
                    {String(row[col] ?? "")}
                  </td>
                ))}
                <td
                  className={cn(
                    "px-2 py-1.5 text-right text-[11px] font-medium",
                    props.theme.text,
                  )}
                >
                  {formatPrice(price)}
                  {suffix && (
                    <span className="text-muted-foreground ml-0.5 text-[10px]">
                      {suffix}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function GridPricingSection(props: {
  gridPricing: GridPricingRow[];
  priceMultiplier?: number;
  theme: ReturnType<typeof getVendorTheme>;
}) {
  const t = useTranslations();

  return (
    <section>
      <SectionHeading theme={props.theme}>
        {t("MODELS.DETAIL.GRID_PRICING")}
      </SectionHeading>
      <div
        className={cn(
          "rounded-lg border p-3",
          props.theme.bg,
          props.theme.border,
        )}
      >
        <GridPricingTable
          rows={props.gridPricing}
          priceMultiplier={props.priceMultiplier}
          theme={props.theme}
          pricingLabel={t("MODELS.DETAIL.PRICING")}
        />
      </div>
    </section>
  );
}

function GroupPricingSection(props: {
  model: PricingCatalogDetail;
  groupRatioMap: Record<string, number>;
  autoGroups: string[];
  theme: ReturnType<typeof getVendorTheme>;
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const model = props.model;
  const theme = props.theme;
  const hasGrid = !!model.grid_pricing?.length;
  const groupEntries = buildGroupEntries(
    model.enable_groups,
    props.groupRatioMap,
  );

  if (groupEntries.length === 0) return null;

  return (
    <section>
      <AutoGroupChain
        enableGroups={model.enable_groups}
        autoGroups={props.autoGroups}
        groupRatioMap={props.groupRatioMap}
        className="mb-3"
      />
      <button
        onClick={() => setOpen(!open)}
        className="mb-3 flex w-full items-center gap-2"
      >
        <Icon name="layers" className="h-3.5 w-3.5 text-amber-400" />
        <span className="text-foreground font-mono text-xs tracking-wider uppercase">
          {hasGrid
            ? t("MODELS.DETAIL.GRID_PRICING_GROUP")
            : t("MODELS.DETAIL.GROUP_PRICING")}
        </span>
        <Icon
          name="chevron-down"
          className={cn(
            "text-muted-foreground ml-auto h-3.5 w-3.5 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="space-y-4">
          {hasGrid ? (
            <GroupPricingGrid
              entries={groupEntries}
              gridPricing={model.grid_pricing!}
              theme={theme}
            />
          ) : model.is_fixed_price ? (
            <GroupPricingFixed
              entries={groupEntries}
              fixedPrice={model.original_fixed_price ?? model.fixed_price}
              model={model}
              theme={theme}
            />
          ) : (
            <GroupPricingTokens
              entries={groupEntries}
              modelRatio={model.model_ratio}
              completionRatio={model.completion_ratio}
              theme={theme}
            />
          )}
        </div>
      )}
    </section>
  );
}

function GroupPricingGrid(props: {
  entries: GroupEntry[];
  gridPricing: GridPricingRow[];
  theme: ReturnType<typeof getVendorTheme>;
}) {
  const t = useTranslations();
  return (
    <>
      {props.entries.map((ge) => (
        <div key={ge.group}>
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[10px] text-cyan-400">
              {ge.group}
            </span>
            <span className="text-muted-foreground font-mono text-[10px]">
              {ge.ratio}x
            </span>
          </div>
          <div
            className={cn(
              "rounded-lg border p-3",
              props.theme.bg,
              props.theme.border,
            )}
          >
            <GridPricingTable
              rows={props.gridPricing}
              priceMultiplier={ge.ratio}
              theme={props.theme}
              pricingLabel={t("MODELS.DETAIL.PRICING")}
            />
          </div>
        </div>
      ))}
    </>
  );
}

function GroupPricingFixed(props: {
  entries: GroupEntry[];
  fixedPrice: number;
  model: PricingCatalogDetail;
  theme: ReturnType<typeof getVendorTheme>;
}) {
  const t = useTranslations();
  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        props.theme.bg,
        props.theme.border,
      )}
    >
      <div className="border-border/40 mb-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-0 border-b pb-2">
        <span className="text-muted-foreground font-mono text-[10px] uppercase">
          {t("MODELS.DETAIL.GROUP_HEADER_GROUP")}
        </span>
        <span className="text-muted-foreground text-right font-mono text-[10px] uppercase">
          {t("MODELS.DETAIL.PRICING")}
        </span>
      </div>
      <div className="space-y-1.5">
        {props.entries.map((ge) => (
          <div
            key={ge.group}
            className="grid grid-cols-[1fr_auto] items-baseline gap-x-4"
          >
            <span className="text-muted-foreground truncate font-mono text-[10px]">
              {ge.group}
            </span>
            <span
              className={cn(
                "text-right font-mono text-xs font-medium",
                props.theme.text,
              )}
            >
              {formatPrice(props.fixedPrice * ge.ratio)}
              <span className="text-muted-foreground ml-1 text-[10px] font-normal">
                <FixedPriceUnit model={props.model} />
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GroupPricingTokens(props: {
  entries: GroupEntry[];
  modelRatio: number;
  completionRatio: number;
  theme: ReturnType<typeof getVendorTheme>;
}) {
  const t = useTranslations();
  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        props.theme.bg,
        props.theme.border,
      )}
    >
      <div className="border-border/40 mb-2 grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-0 border-b pb-2">
        <span className="text-muted-foreground font-mono text-[10px] uppercase">
          {t("MODELS.DETAIL.GROUP_HEADER_GROUP")}
        </span>
        <span className="text-muted-foreground text-right font-mono text-[10px] uppercase">
          {t("MODELS.DETAIL.GROUP_HEADER_INPUT")}
        </span>
        <span className="text-muted-foreground text-right font-mono text-[10px] uppercase">
          {t("MODELS.DETAIL.GROUP_HEADER_OUTPUT")}
        </span>
      </div>
      <div className="space-y-1.5">
        {props.entries.map((ge) => {
          const inputPrice = props.modelRatio * 2 * ge.ratio;
          const outputPrice = inputPrice * props.completionRatio;
          return (
            <div
              key={ge.group}
              className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-4"
            >
              <span className="text-muted-foreground truncate font-mono text-[10px]">
                {ge.group}
              </span>
              <span
                className={cn(
                  "text-right font-mono text-xs font-medium",
                  props.theme.text,
                )}
              >
                {formatPrice(inputPrice)}
              </span>
              <span
                className={cn(
                  "text-right font-mono text-xs font-medium",
                  props.theme.text,
                )}
              >
                {formatPrice(outputPrice)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
