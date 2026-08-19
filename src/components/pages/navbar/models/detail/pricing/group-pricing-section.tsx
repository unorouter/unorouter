"use client";

import type { PricingCatalogDetail } from "@/openapi";

import { CopyButton } from "@/components/elements/code/copy-button";
import { Icon } from "@/components/ui/icon";
import {
  buildGroupEntries,
  type GroupEntry,
  gridPriceParts,
  gridPricingColumns,
  type GridPricingRow,
} from "@/lib/api/pricing";
import { getVendorTheme } from "@/lib/config/vendor-registry";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/utils/format/number";
import {
  MINI_TABLE,
  MINI_TABLE_BODY_ROW,
  MINI_TABLE_HEAD_ROW,
} from "../shared/mini-table";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { FixedPriceUnit } from "../shared/fixed-price-unit";

type Theme = ReturnType<typeof getVendorTheme>;

export function GroupPricingSection(props: {
  model: PricingCatalogDetail;
  groupRatioMap: Record<string, number>;
  theme: Theme;
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const model = props.model;
  const hasGrid = !!model.grid_pricing?.length;
  const entries = buildGroupEntries(model.enable_groups, props.groupRatioMap);

  if (entries.length === 0) return null;

  return (
    <div className="mt-6 overflow-hidden rounded-md border">
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
              theme={props.theme}
            />
          ) : model.is_fixed_price ? (
            <GroupFixed
              entries={entries}
              fixedPrice={model.original_fixed_price ?? model.fixed_price}
              model={model}
              theme={props.theme}
            />
          ) : (
            <GroupTokens
              entries={entries}
              modelRatio={model.model_ratio}
              completionRatio={model.completion_ratio}
              theme={props.theme}
            />
          )}
        </div>
      )}
    </div>
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
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function GroupGrid(props: {
  entries: GroupEntry[];
  gridPricing: GridPricingRow[];
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
