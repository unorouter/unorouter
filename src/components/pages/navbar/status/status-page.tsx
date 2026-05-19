"use client";

import { LogoImage } from "@/components/elements/brand/brand";
import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { VendorFilter } from "@/components/pages/navbar/models/filters/vendor-filter";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { StatusBanner } from "@/components/ui/status/status-banner";
import { StatusBar } from "@/components/ui/status/status-bar";
import {
    StatusComponent,
    StatusComponentBody,
    StatusComponentDescription,
    StatusComponentHeader,
    StatusComponentHeaderLeft,
    StatusComponentHeaderRight,
    StatusComponentIcon,
    StatusComponentStatus,
    StatusComponentTitle,
    StatusComponentUptime,
} from "@/components/ui/status/status-component";
import type {
    StatusBarData,
    StatusType,
} from "@/components/ui/status/status.types";
import type { StatusBucket } from "@/lib/types/status";
import { usePerfMetricsSummaryQuery } from "@/hooks/perf-metrics-hook";
import { usePricingQuery } from "@/hooks/pricing-hook";
import { BUCKET_OPTIONS, useStatusFilter } from "@/hooks/ui/use-status-hook";
import { env } from "@/lib/config/env";
import type { IconName } from "@/lib/config/icon-map";
import { cn } from "@/lib/utils";
import { formatLatency, formatTps } from "@/lib/utils/format/number";
import { formatHoursLabel } from "@/lib/utils/format/date";
import type { ModelSummary } from "@/openapi";
import { useTranslations } from "next-intl";
import { WindowVirtualizer } from "virtua";
import { StatusBlocksI18n } from "./status-blocks-i18n";
import { SummaryCards } from "./summary-cards";

type ComponentVariant = Exclude<StatusType, "empty">;

const COMPONENT_VARIANTS = new Set<string>(["success", "degraded", "error"]);

// OpenStatus's variant prop disallows "empty"; fall back to "success" for any
// unknown status so the component still renders.
function asVariant(status: string): ComponentVariant {
  return COMPONENT_VARIANTS.has(status)
    ? (status as ComponentVariant)
    : "success";
}

export function StatusPage() {
  const t = useTranslations();
  const s = useStatusFilter();
  // Pricing models are still needed by the VendorFilter dropdown for icons +
  // counts, so pull them straight from the cached pricing query.
  const pricing = usePricingQuery();
  const pricingModels = pricing.data?.models ?? [];
  // Per-model perf summary, keyed by model_name for O(1) lookup per row.
  const perfQuery = usePerfMetricsSummaryQuery(24);
  const perfMap = new Map<string, ModelSummary>(
    (perfQuery.data?.models ?? []).map((row) => [row.model_name, row]),
  );

  return (
    <StatusBlocksI18n>
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-12 text-center">
          <a
            href={env.appUrl}
            className="group focus-visible:ring-ring/50 mb-6 inline-flex cursor-pointer items-center gap-2 rounded-sm border border-red-500/30 bg-red-500/10 px-3 py-1.5 transition-colors hover:border-red-500/60 hover:bg-red-500/20 focus-visible:ring-2 focus-visible:outline-none"
            aria-label={env.appName}
          >
            <LogoImage
              width={14}
              height={14}
              className="rounded-none transition-transform group-hover:scale-110"
            />
            <span className="font-mono text-[10px] tracking-[0.2em] text-red-500 uppercase group-hover:underline">
              {t("STATUS.BADGE")}
            </span>
          </a>
          <h1 className="text-4xl font-bold tracking-tighter">
            {t("STATUS.TITLE")}
          </h1>
          <p className="text-muted-foreground mt-3 font-mono text-sm leading-relaxed">
            {t("STATUS.SUBTITLE")}
          </p>
        </div>

        <div className="space-y-6">
          <StatusBanner status={s.overallStatus} />
          <SummaryCards />

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full">
              <Icon
                name="search"
                className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
              />
              <Input
                placeholder={t("STATUS.FILTER.SEARCH_PLACEHOLDER")}
                value={s.search}
                onChange={(e) => s.setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <VendorFilter models={pricingModels} />
            <Select
              value={s.bucket}
              onValueChange={(v) => s.setBucket(v as StatusBucket)}
            >
              <SelectTrigger className="w-27.5 font-mono text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUCKET_OPTIONS.map((o) => (
                  <SelectItem
                    key={o.value}
                    value={o.value}
                    className="font-mono text-xs"
                  >
                    <span className="flex w-full items-center justify-between gap-3">
                      <span>{o.value}</span>
                      <span className="text-muted-foreground text-[10px]">
                        {formatHoursLabel(o.hours)}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap items-center gap-1">
              {(
                [
                  { value: "all", label: t("STATUS.FILTER.STATUS_ALL") },
                  { value: "success", label: t("STATUS.STATE.OPERATIONAL") },
                  { value: "degraded", label: t("STATUS.STATE.DEGRADED") },
                  { value: "error", label: t("STATUS.STATE.DOWN") },
                ] as const
              ).map((p) => (
                <FilterPill
                  key={p.value}
                  active={s.statusFilter === p.value}
                  onClick={() => s.setStatusFilter(p.value)}
                  label={p.label}
                />
              ))}
              {s.visibleVendors.length > 0 && (
                <CollapseAllButton
                  collapsed={s.allCollapsed}
                  onClick={s.toggleAllGroups}
                />
              )}
              {s.hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={s.resetFilters}
                  className="font-mono text-xs"
                >
                  {t("MODELS.FILTER.RESET")}
                  <Icon name="x" className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {s.filtered.length === 0 ? (
            <p className="text-muted-foreground py-24 text-center font-mono text-sm">
              {t("STATUS.FILTER.EMPTY")}
            </p>
          ) : (
            <WindowVirtualizer>
              {s.items.map((item) =>
                item.kind === "header" ? (
                  <button
                    type="button"
                    key={`header-${item.vendor}`}
                    onClick={() => s.toggleVendorCollapsed(item.vendor)}
                    className="hover:bg-accent/40 flex w-full items-center gap-2 rounded-md px-2 pt-6 pb-3 text-left first:pt-0"
                  >
                    <Icon
                      name={
                        s.collapsedSet.has(item.vendor)
                          ? "chevron-right"
                          : "chevron-down"
                      }
                      className="text-muted-foreground h-4 w-4 shrink-0"
                    />
                    <VendorIcon vendor={item.vendor} size={16} />
                    <h2 className="min-w-0 truncate font-mono text-sm font-semibold tracking-wide">
                      {item.vendor}
                    </h2>
                    <span className="text-muted-foreground shrink-0 font-mono text-xs">
                      {item.count}
                    </span>
                    <div className="text-muted-foreground ml-auto flex shrink-0 items-center gap-3 font-mono text-xs">
                      <StatusCount
                        icon="circle-check"
                        count={item.operational}
                        iconClass="text-emerald-500"
                      />
                      <StatusCount
                        icon="circle-alert"
                        count={item.degraded}
                        textClass={
                          item.degraded > 0 ? "text-amber-500" : undefined
                        }
                      />
                      <StatusCount
                        icon="circle-x"
                        count={item.down}
                        textClass={item.down > 0 ? "text-red-500" : undefined}
                      />
                    </div>
                  </button>
                ) : (
                  <div key={`row-${item.component.id}`} className="pb-4">
                    <StatusComponent variant={asVariant(item.component.status)}>
                      <StatusComponentHeader>
                        <StatusComponentHeaderLeft>
                          <StatusComponentIcon />
                          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <div className="flex min-w-0 items-center gap-2">
                              <StatusComponentTitle>
                                {item.component.name}
                              </StatusComponentTitle>
                              {item.component.description && (
                                <StatusComponentDescription>
                                  {item.component.description}
                                </StatusComponentDescription>
                              )}
                            </div>
                            <PerfStats perf={perfMap.get(item.component.name)} />
                          </div>
                        </StatusComponentHeaderLeft>
                        <StatusComponentHeaderRight>
                          <StatusComponentUptime>
                            {item.component.uptime_24h.toFixed(2)}%
                          </StatusComponentUptime>
                          <StatusComponentStatus />
                        </StatusComponentHeaderRight>
                      </StatusComponentHeader>
                      <StatusComponentBody>
                        <StatusBar
                          data={
                            (s.bars[item.component.name] ??
                              []) as unknown as StatusBarData[]
                          }
                        />
                      </StatusComponentBody>
                    </StatusComponent>
                  </div>
                ),
              )}
            </WindowVirtualizer>
          )}
        </div>
      </div>
    </StatusBlocksI18n>
  );
}

function FilterPill(props: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <Button
      variant={props.active ? "default" : "outline"}
      size="sm"
      onClick={props.onClick}
      className="font-mono text-xs"
    >
      {props.label}
    </Button>
  );
}

function CollapseAllButton(props: { collapsed: boolean; onClick: () => void }) {
  const t = useTranslations();
  const label = props.collapsed
    ? t("STATUS.FILTER.EXPAND_ALL")
    : t("STATUS.FILTER.COLLAPSE_ALL");
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={props.onClick}
      aria-label={label}
      title={label}
    >
      <Icon
        name={props.collapsed ? "chevrons-up-down" : "chevrons-down-up"}
        className="h-4 w-4"
      />
    </Button>
  );
}

function StatusCount(props: {
  icon: IconName;
  count: number;
  iconClass?: string;
  textClass?: string;
}) {
  return (
    <span className={cn("flex items-center gap-1", props.textClass)}>
      <Icon name={props.icon} className={cn("h-3.5 w-3.5", props.iconClass)} />
      {props.count}
    </span>
  );
}

function PerfStats(props: { perf: ModelSummary | undefined }) {
  const t = useTranslations();
  if (!props.perf || props.perf.request_count <= 0) return null;
  return (
    <div className="text-muted-foreground flex items-center gap-3 font-mono text-[10px] tabular-nums">
      <span title={t("STATUS.PERF.LATENCY_TOOLTIP")}>
        {formatLatency(props.perf.avg_latency_ms, 1)}
      </span>
      <span title={t("STATUS.PERF.TPS_TOOLTIP")}>
        {formatTps(props.perf.avg_tps, "t/s")}
      </span>
    </div>
  );
}
