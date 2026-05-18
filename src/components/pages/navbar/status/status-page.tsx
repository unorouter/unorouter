"use client";

import { LogoImage } from "@/components/elements/brand/brand";
import { Icon } from "@/components/ui/icon";
import { VendorIcon } from "@/components/elements/brand/vendor-icon";
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
import { VendorFilter } from "@/components/pages/navbar/models/filters/vendor-filter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePerfMetricsSummaryQuery } from "@/hooks/perf-metrics-hook";
import { usePricingQuery } from "@/hooks/pricing-hook";
import type { StatusBucket } from "@/hooks/use-model-status-hook";
import { BUCKET_OPTIONS, useStatusFilter } from "@/hooks/ui/use-status-hook";
import type { PerfModelSummary } from "@/lib/api/perf-metrics";
import { env } from "@/lib/config/env";
import { useTranslations } from "next-intl";
import { WindowVirtualizer } from "virtua";
import { StatusBlocksI18n } from "./status-blocks-i18n";
import { SummaryCards } from "./summary-cards";

const VARIANT_FALLBACK: Exclude<StatusType, "empty"> = "success";

function asVariant(status: string): Exclude<StatusType, "empty"> {
  switch (status) {
    case "success":
    case "degraded":
    case "error":
      return status;
    default:
      // OpenStatus's variant prop disallows "empty"; surface as success-ish.
      return VARIANT_FALLBACK;
  }
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
  const perfMap = new Map<string, PerfModelSummary>(
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

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
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
            <div className="flex flex-wrap gap-1">
              <FilterPill
                active={s.statusFilter === "all"}
                onClick={() => s.setStatusFilter("all")}
                label={t("STATUS.FILTER.STATUS_ALL")}
              />
              <FilterPill
                active={s.statusFilter === "success"}
                onClick={() => s.setStatusFilter("success")}
                label={t("STATUS.STATE.OPERATIONAL")}
              />
              <FilterPill
                active={s.statusFilter === "degraded"}
                onClick={() => s.setStatusFilter("degraded")}
                label={t("STATUS.STATE.DEGRADED")}
              />
              <FilterPill
                active={s.statusFilter === "error"}
                onClick={() => s.setStatusFilter("error")}
                label={t("STATUS.STATE.DOWN")}
              />
            </div>
            {s.visibleVendors.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={s.toggleAllGroups}
                aria-label={
                  s.allCollapsed
                    ? t("STATUS.FILTER.EXPAND_ALL")
                    : t("STATUS.FILTER.COLLAPSE_ALL")
                }
                title={
                  s.allCollapsed
                    ? t("STATUS.FILTER.EXPAND_ALL")
                    : t("STATUS.FILTER.COLLAPSE_ALL")
                }
              >
                {s.allCollapsed ? (
                  <Icon name="chevrons-up-down" className="h-4 w-4" />
                ) : (
                  <Icon name="chevrons-down-up" className="h-4 w-4" />
                )}
              </Button>
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
                    {s.collapsedSet.has(item.vendor) ? (
                      <Icon
                        name="chevron-right"
                        className="text-muted-foreground h-4 w-4 shrink-0"
                      />
                    ) : (
                      <Icon
                        name="chevron-down"
                        className="text-muted-foreground h-4 w-4 shrink-0"
                      />
                    )}
                    <VendorIcon vendor={item.vendor} size={16} />
                    <h2 className="font-mono text-sm font-semibold tracking-wide">
                      {item.vendor}
                    </h2>
                    <span className="text-muted-foreground font-mono text-xs">
                      {item.count}
                    </span>
                    <div className="text-muted-foreground ml-auto flex items-center gap-3 font-mono text-xs">
                      <span className="flex items-center gap-1">
                        <Icon
                          name="circle-check"
                          className="h-3.5 w-3.5 text-emerald-500"
                        />
                        {item.operational}
                      </span>
                      <span
                        className={
                          item.degraded > 0
                            ? "flex items-center gap-1 text-amber-500"
                            : "flex items-center gap-1"
                        }
                      >
                        <Icon name="circle-alert" className="h-3.5 w-3.5" />
                        {item.degraded}
                      </span>
                      <span
                        className={
                          item.down > 0
                            ? "flex items-center gap-1 text-red-500"
                            : "flex items-center gap-1"
                        }
                      >
                        <Icon name="circle-x" className="h-3.5 w-3.5" />
                        {item.down}
                      </span>
                    </div>
                  </button>
                ) : (
                  <div key={`row-${item.component.id}`} className="pb-4">
                    <StatusComponent variant={asVariant(item.component.status)}>
                      <StatusComponentHeader>
                        <StatusComponentHeaderLeft>
                          <StatusComponentIcon />
                          <StatusComponentTitle>
                            {item.component.name}
                          </StatusComponentTitle>
                          {item.component.description && (
                            <StatusComponentDescription>
                              {item.component.description}
                            </StatusComponentDescription>
                          )}
                        </StatusComponentHeaderLeft>
                        <StatusComponentHeaderRight>
                          <PerfStats perf={perfMap.get(item.component.name)} />
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

// Compact human label for the time-window the bucket spans (24h -> "24h",
// 720h -> "30d"). Shown next to each bucket option so the user can see what
// range it covers without having to do the math.
function formatHoursLabel(hours: number): string {
  if (hours >= 24 && hours % 24 === 0) return `${hours / 24}d`;
  return `${hours}h`;
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

function formatLatency(ms: number): string {
  if (!ms) return "—";
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

function formatTps(tps: number): string {
  if (!tps) return "—";
  if (tps >= 100) return `${tps.toFixed(0)}t/s`;
  return `${tps.toFixed(1)}t/s`;
}

function PerfStats(props: { perf: PerfModelSummary | undefined }) {
  const t = useTranslations();
  if (!props.perf || props.perf.request_count <= 0) return null;
  return (
    <div className="text-muted-foreground hidden items-center gap-3 font-mono text-[10px] tabular-nums sm:flex">
      <span title={t("STATUS.PERF.LATENCY_TOOLTIP")}>
        {formatLatency(props.perf.avg_latency_ms)}
      </span>
      <span title={t("STATUS.PERF.TPS_TOOLTIP")}>
        {formatTps(props.perf.avg_tps)}
      </span>
    </div>
  );
}
