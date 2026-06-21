"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { ModelRowActions } from "./model-row-actions";
import { DataTableColumnHeader } from "@/components/elements/table/data-table-column-header";
import { Icon } from "@/components/ui/icon";
import { modelReleaseTs } from "@/hooks/ui/use-models-hook";
import {
  deriveOutputModality,
  inputPriceUnit,
  outputPriceUnit,
  type PriceUnit,
} from "@/lib/api/model-modality";
import type { ProcessedModel } from "@/lib/api/pricing";
import type { RankedModel } from "@/lib/api/typebox/rankings";
import { formatMsDate } from "@/lib/utils/format/date";
import {
  discountPercent,
  formatPrice,
  formatTokenCount,
  formatTokens,
} from "@/lib/utils/format/number";
import type { ColumnDef } from "@tanstack/react-table";

function fmtUnit(value: number, unit: PriceUnit, perCall?: boolean): string {
  if (unit === "dash" || value <= 0) return "-";
  if (perCall) return `${formatPrice(value)}/call`;
  if (unit === "perImage") return `${formatPrice(value)}/img`;
  return formatPrice(value);
}

// Fixed-price (quotaType >= 1) models charge a flat per-CALL fee, not per-token.
// Show it once in the input column as "$x/call"; dash the output column so the
// flat fee never reads as an impossibly-cheap per-token rate.
function priceValue(m: ProcessedModel, side: "input" | "output"): number {
  if (m.isFixedPrice) return side === "input" ? m.fixedPrice : 0;
  return side === "input" ? m.inputPrice : m.outputPrice;
}

function PriceCell(props: {
  value: number;
  original: number | null;
  unit: PriceUnit;
  offLabel: string;
  perCall?: boolean;
}) {
  if (props.unit === "dash" || props.value <= 0) {
    return <span className="text-muted-foreground">-</span>;
  }
  const pct = discountPercent(props.value, props.original);
  return (
    <span className="flex flex-col items-end">
      <span>{fmtUnit(props.value, props.unit, props.perCall)}</span>
      {pct > 0 && (
        <span className="flex flex-col items-end gap-0.5 text-[10px] lg:flex-row lg:items-center lg:gap-1">
          {props.original !== null && (
            <span className="text-muted-foreground/60 line-through">
              {fmtUnit(props.original, props.unit, props.perCall)}
            </span>
          )}
          <span className="rounded bg-green-500/15 px-1 text-green-600 dark:text-green-400">
            {props.offLabel}
          </span>
        </span>
      )}
    </span>
  );
}

// offLabel is passed in so columns stay render-pure; rankMap joins weekly-token volume from the rankings endpoint.
export function buildModelColumns(opts: {
  rankMap: Map<string, RankedModel>;
  offLabel: (pct: number) => string;
  freeLabel: string;
}): ColumnDef<ProcessedModel>[] {
  const rankTokens = (m: ProcessedModel) =>
    opts.rankMap.get(m.name)?.total_tokens ?? 0;
  const ctxOf = (m: ProcessedModel) =>
    m.metadata.contextWindow ?? m.metadata.maxInputTokens ?? 0;

  return [
    {
      id: "name",
      accessorFn: (m) => m.name,
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="MODELS.TABLE.MODEL" />
      ),
      meta: { headerClassName: "w-[40%]" },
      cell: ({ row }) => {
        const m = row.original;
        return (
          <span className="flex min-w-0 items-center gap-1.5">
            <VendorIcon vendor={m.vendor.name} size={18} />
            <span className="truncate font-mono text-xs lg:text-sm">
              {m.name}
            </span>
            {m.isFree && (
              <span className="flex shrink-0 items-center gap-0.5 rounded bg-emerald-500/15 px-1 py-0.5 font-mono text-[10px] text-emerald-600 lg:px-1.5 dark:text-emerald-400">
                <Icon name="gift" className="h-3 w-3" />
                <span className="hidden lg:inline">{opts.freeLabel}</span>
              </span>
            )}
          </span>
        );
      },
    },
    {
      id: "topWeekly",
      accessorFn: rankTokens,
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="MODELS.TABLE.WEEKLY_TOKENS"
          className="justify-end"
        />
      ),
      meta: {
        headerClassName: "hidden lg:table-cell text-right",
        cellClassName: "hidden lg:table-cell text-right text-muted-foreground",
      },
      cell: ({ row }) => {
        const v = rankTokens(row.original);
        return v > 0 ? formatTokens(v) : "-";
      },
    },
    {
      id: "input",
      accessorFn: (m) => priceValue(m, "input"),
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="MODELS.TABLE.INPUT"
          className="justify-end"
        />
      ),
      meta: { headerClassName: "text-right", cellClassName: "text-right" },
      cell: ({ row }) => {
        const m = row.original;
        return (
          <PriceCell
            value={priceValue(m, "input")}
            original={m.originalInputPrice}
            unit={inputPriceUnit(deriveOutputModality(m))}
            perCall={m.isFixedPrice}
            offLabel={opts.offLabel(
              discountPercent(priceValue(m, "input"), m.originalInputPrice),
            )}
          />
        );
      },
    },
    {
      id: "output",
      accessorFn: (m) => priceValue(m, "output"),
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="MODELS.TABLE.OUTPUT"
          className="justify-end"
        />
      ),
      meta: { headerClassName: "text-right", cellClassName: "text-right" },
      cell: ({ row }) => {
        const m = row.original;
        return (
          <PriceCell
            value={priceValue(m, "output")}
            original={m.originalOutputPrice}
            unit={outputPriceUnit(deriveOutputModality(m))}
            offLabel={opts.offLabel(
              discountPercent(priceValue(m, "output"), m.originalOutputPrice),
            )}
          />
        );
      },
    },
    {
      id: "context",
      accessorFn: ctxOf,
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="MODELS.TABLE.CONTEXT"
          className="justify-end"
        />
      ),
      meta: {
        headerClassName: "text-right",
        cellClassName: "text-right text-muted-foreground",
      },
      cell: ({ row }) => formatTokenCount(ctxOf(row.original)),
    },
    {
      id: "released",
      accessorFn: (m) => modelReleaseTs(m),
      enableSorting: true,
      sortingFn: (a, b) =>
        modelReleaseTs(a.original) - modelReleaseTs(b.original),
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="MODELS.TABLE.RELEASED"
          className="justify-end"
        />
      ),
      meta: {
        headerClassName: "hidden lg:table-cell text-right",
        cellClassName: "hidden lg:table-cell text-right text-muted-foreground",
      },
      cell: ({ row }) => {
        const ts = modelReleaseTs(row.original);
        return ts > 0 ? formatMsDate(ts) : "-";
      },
    },
    {
      id: "actions",
      enableSorting: false,
      header: () => null,
      meta: { headerClassName: "w-10", cellClassName: "text-right" },
      cell: ({ row }) => <ModelRowActions model={row.original} />,
    },
  ];
}
