"use client";

import type { GroupResult, PricingCatalogDetail } from "@/openapi";

import { CopyButton } from "@/components/elements/code/copy-button";
import { Icon } from "@/components/ui/icon";
import {
  buildGroupEntries,
  type GroupEntry,
  gridPriceParts,
  gridPricingColumns,
  type GridPricingRow,
} from "@/lib/api/pricing";
import { usePerfMetricsQuery } from "@/hooks/models/perf-metrics-hook";
import { getVendorTheme } from "@/lib/config/vendor-registry";
import { cn } from "@/lib/utils";
import {
  formatLatency,
  formatPct,
  formatPrice,
} from "@/lib/utils/format/number";
import {
  MINI_TABLE,
  MINI_TABLE_BODY_ROW,
  MINI_TABLE_HEAD_ROW,
} from "../shared/mini-table";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { FixedPriceUnit } from "../shared/fixed-price-unit";
import { AutoGroupChain } from "./auto-group-chain";

type Theme = ReturnType<typeof getVendorTheme>;

export function GroupPricingSection(props: {
  model: PricingCatalogDetail;
  groupRatioMap: Record<string, number>;
  autoGroups?: string[];
  theme: Theme;
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const model = props.model;
  const hasGrid = !!model.grid_pricing?.length;
  const entries = buildGroupEntries(model.enable_groups, props.groupRatioMap);
  // Passing null while collapsed leaves the query disabled, so opening the
  // section is what pays for it. On the detail page the same key is already in
  // flight for the performance panel, so this resolves from cache.
  const perfQuery = usePerfMetricsQuery(open ? model.model_name : null, 24);
  const health = buildHealthMap(perfQuery.data?.groups);

  if (entries.length === 0) return null;

  return (
    <div className="mt-6 overflow-hidden rounded-md border">
      {props.autoGroups && (
        <AutoGroupChain
          enableGroups={model.enable_groups}
          autoGroups={props.autoGroups}
          groupRatioMap={props.groupRatioMap}
          className="border-border/60 border-b px-4 py-2"
        />
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="hover:bg-muted/30 flex w-full items-center gap-2 px-4 py-2.5 transition-colors"
      >
        <Icon name="layers" className={cn("h-3.5 w-3.5", props.theme.text)} />
        <span className="text-muted-foreground font-mono text-[11px] tracking-wider uppercase">
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
        <div className="border-border/60 space-y-4 border-t p-4">
          {hasGrid ? (
            <GroupGrid
              entries={entries}
              gridPricing={model.grid_pricing!}
              health={health}
              theme={props.theme}
            />
          ) : model.is_fixed_price ? (
            <GroupFixed
              entries={entries}
              fixedPrice={model.original_fixed_price ?? model.fixed_price}
              model={model}
              health={health}
              theme={props.theme}
            />
          ) : (
            <GroupTokens
              entries={entries}
              modelRatio={model.model_ratio}
              completionRatio={model.completion_ratio}
              health={health}
              theme={props.theme}
            />
          )}
        </div>
      )}
    </div>
  );
}

type GroupHealth = {
  ttftMs: number;
  successRate: number;
  uptimePct: number | null;
};

function buildHealthMap(
  groups: GroupResult[] | null | undefined,
): Map<string, GroupHealth> {
  const map = new Map<string, GroupHealth>();
  for (const g of groups ?? [])
    map.set(g.group, {
      ttftMs: g.avg_ttft_ms,
      successRate: g.success_rate,
      // Uptime comes from channel transition history, so a group with no
      // recorded flips has none rather than 0%.
      uptimePct: g.uptime_percent ?? null,
    });
  return map;
}

// A group only appears here once it has served traffic in the window, so a
// missing entry means "no data", never zero.
function HealthCells(props: { health: GroupHealth | undefined }) {
  const h = props.health;
  return (
    <>
      <td className="text-muted-foreground py-1.5 text-right">
        {h && h.ttftMs > 0 ? formatLatency(h.ttftMs) : "-"}
      </td>
      <td className="text-muted-foreground py-1.5 text-right">
        {h ? formatPct(h.successRate) : "-"}
      </td>
      <td className="text-muted-foreground py-1.5 text-right">
        {h?.uptimePct != null ? formatPct(h.uptimePct) : "-"}
      </td>
    </>
  );
}

// The grid branch renders a sub-table per group, so its stats sit on the group
// heading rather than as extra columns.
function GroupHealthInline(props: { health: GroupHealth | undefined }) {
  const t = useTranslations();
  if (!props.health) return null;
  return (
    <span className="text-muted-foreground font-mono text-[10px]">
      {props.health.ttftMs > 0 &&
        `${t("MODELS.DETAIL.PERF_TTFT")} ${formatLatency(props.health.ttftMs)}, `}
      {t("MODELS.DETAIL.PERF_SUCCESS")} {formatPct(props.health.successRate)}
      {props.health.uptimePct != null &&
        `, ${t("MODELS.DETAIL.UPTIME")} ${formatPct(props.health.uptimePct)}`}
    </span>
  );
}

function HealthHeaders() {
  const t = useTranslations();
  return (
    <>
      <th className="py-1.5 text-right font-normal">
        {t("MODELS.DETAIL.PERF_TTFT")}
      </th>
      <th className="py-1.5 text-right font-normal">
        {t("MODELS.DETAIL.PERF_SUCCESS")}
      </th>
      <th className="py-1.5 text-right font-normal">
        {t("MODELS.DETAIL.UPTIME")}
      </th>
    </>
  );
}

// The group name IS the X-Group header value for pinning a request to it.
function GroupNameCell(props: { group: string }) {
  return (
    <span className="group/gn inline-flex items-center gap-1.5">
      {props.group}
      <span className="opacity-0 transition-opacity group-hover/gn:opacity-100">
        <CopyButton text={props.group} iconSize="h-3 w-3" />
      </span>
    </span>
  );
}

function GroupTokens(props: {
  entries: GroupEntry[];
  modelRatio: number;
  completionRatio: number;
  health: Map<string, GroupHealth>;
  theme: Theme;
}) {
  const t = useTranslations();
  return (
    <table className={MINI_TABLE}>
      <thead>
        <tr className={MINI_TABLE_HEAD_ROW}>
          <th className="py-1.5 text-left font-normal">
            {t("MODELS.DETAIL.GROUP_HEADER_GROUP")}
          </th>
          <th className="py-1.5 text-right font-normal">
            {t("MODELS.DETAIL.GROUP_HEADER_INPUT")}
          </th>
          <th className="py-1.5 text-right font-normal">
            {t("MODELS.DETAIL.GROUP_HEADER_OUTPUT")}
          </th>
          <HealthHeaders />
        </tr>
      </thead>
      <tbody>
        {props.entries.map((ge) => {
          const inputPrice = props.modelRatio * 2 * ge.ratio;
          const outputPrice = inputPrice * props.completionRatio;
          return (
            <tr key={ge.group} className={MINI_TABLE_BODY_ROW}>
              <td className="text-muted-foreground py-1.5">
                <GroupNameCell group={ge.group} />
              </td>
              <td className={cn("py-1.5 text-right", props.theme.text)}>
                {formatPrice(inputPrice)}
              </td>
              <td className={cn("py-1.5 text-right", props.theme.text)}>
                {formatPrice(outputPrice)}
              </td>
              <HealthCells health={props.health.get(ge.group)} />
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function GroupFixed(props: {
  entries: GroupEntry[];
  fixedPrice: number;
  model: PricingCatalogDetail;
  health: Map<string, GroupHealth>;
  theme: Theme;
}) {
  const t = useTranslations();
  return (
    <table className={MINI_TABLE}>
      <thead>
        <tr className={MINI_TABLE_HEAD_ROW}>
          <th className="py-1.5 text-left font-normal">
            {t("MODELS.DETAIL.GROUP_HEADER_GROUP")}
          </th>
          <th className="py-1.5 text-right font-normal">
            {t("MODELS.DETAIL.PRICING")}
          </th>
          <HealthHeaders />
        </tr>
      </thead>
      <tbody>
        {props.entries.map((ge) => (
          <tr key={ge.group} className={MINI_TABLE_BODY_ROW}>
            <td className="text-muted-foreground py-1.5">
              <GroupNameCell group={ge.group} />
            </td>
            <td className={cn("py-1.5 text-right", props.theme.text)}>
              {formatPrice(props.fixedPrice * ge.ratio)}
              <span className="text-muted-foreground ml-1 text-[10px] font-normal">
                <FixedPriceUnit model={props.model} />
              </span>
            </td>
            <HealthCells health={props.health.get(ge.group)} />
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function GroupGrid(props: {
  entries: GroupEntry[];
  gridPricing: GridPricingRow[];
  health: Map<string, GroupHealth>;
  theme: Theme;
}) {
  const t = useTranslations();
  const columns = gridPricingColumns(props.gridPricing);
  return (
    <>
      {props.entries.map((ge) => (
        <div key={ge.group}>
          <div className="mb-2 flex items-center gap-2">
            <span className={cn("font-mono text-[11px]", props.theme.text)}>
              {ge.group}
            </span>
            <CopyButton text={ge.group} iconSize="h-3 w-3" />
            <span className="text-muted-foreground font-mono text-[10px]">
              {ge.ratio}x
            </span>
            <GroupHealthInline health={props.health.get(ge.group)} />
          </div>
          <div className="overflow-x-auto">
            <table className={MINI_TABLE}>
              <thead>
                <tr className={MINI_TABLE_HEAD_ROW}>
                  {columns.map((col) => (
                    <th key={col} className="py-1.5 text-left font-normal">
                      {col}
                    </th>
                  ))}
                  <th className="py-1.5 text-right font-normal">
                    {t("MODELS.DETAIL.PRICING")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {props.gridPricing.map((row, i) => {
                  const parts = gridPriceParts(row, ge.ratio);
                  return (
                    <tr key={i} className={MINI_TABLE_BODY_ROW}>
                      {columns.map((col) => (
                        <td
                          key={col}
                          className="text-muted-foreground py-1.5 text-[11px]"
                        >
                          {String(row[col] ?? "")}
                        </td>
                      ))}
                      <td
                        className={cn(
                          "py-1.5 text-right text-[11px]",
                          props.theme.text,
                        )}
                      >
                        {formatPrice(parts.price)}
                        {parts.suffix && (
                          <span className="text-muted-foreground ml-0.5 text-[10px]">
                            {parts.suffix}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </>
  );
}
