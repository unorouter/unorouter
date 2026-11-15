"use client";

import { DataTable } from "@/components/elements/table/data-table";
import { buildLogQueryFilters } from "@/components/pages/sidebar/logs/common/log-helpers";
import {
  useUsageLogsQuery,
  useUsageLogsStatQuery,
} from "@/hooks/ops/logs-hook";
import { renderQuota, type TranslationKey } from "@/lib/config/constants";
import { DataTableId } from "@/lib/types/enums";
import { useLogFilters } from "./use-log-filters";
import type { ColumnDef } from "@tanstack/react-table";
import type { TableFeats } from "@/lib/config/table-features";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  LogClientCell,
  LogDetailsContext,
  LogExpandToggleCell,
  LogModelCell,
  LogPricingDetailsCell,
  LogSpendCell,
  LogStreamCell,
  LogTimeCell,
  LogTimingCell,
  LogTokenNameCell,
  LogTokensCell,
  LogUserCell,
} from "./log-cells";
import { LogDetailsDialog } from "./log-details-dialog";
import { LogExpandedRow } from "./log-expanded-row";
import { LogFilters } from "./log-filters";
import { LogsEmptyState } from "./id-filter-bar";
import {
  isConsumeLike,
  LOG_TYPE_ERROR,
  LOG_TYPE_REFUND,
  type LogRow,
} from "./log-helpers";

function StatBadge(props: {
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <span className="border-border/60 bg-muted/25 inline-flex h-7 items-center gap-2 rounded-md border px-2.5 text-xs shadow-xs">
      <span className={`h-3.5 w-0.5 rounded-full ${props.accent}`} />
      <span className="text-muted-foreground">{props.label}</span>
      <span className="text-foreground/85 font-mono font-semibold tabular-nums">
        {props.value}
      </span>
    </span>
  );
}

export function UsageLogs() {
  const t = useTranslations();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLog, setDetailsLog] = useState<LogRow | null>(null);

  const filters = useLogFilters(DataTableId.LOGS);
  const store = filters.store;

  const { filterValues, queryFilters, statFilters } = buildLogQueryFilters(
    store.columnFilters,
    store.pagination,
  );

  const logsQuery = useUsageLogsQuery(queryFilters);
  const statQuery = useUsageLogsStatQuery(statFilters);
  const stat = statQuery.data;

  const col = (
    title: TranslationKey,
    def: ColumnDef<TableFeats, LogRow>,
  ): ColumnDef<TableFeats, LogRow> => ({
    ...def,
    header: t(title),
    enableSorting: false,
    meta: { ...def.meta, title },
  });
  const columns: ColumnDef<TableFeats, LogRow>[] = [
    {
      id: "expand",
      header: "",
      enableHiding: false,
      enableSorting: false,
      meta: { cellClassName: "w-8 px-1" },
      cell: LogExpandToggleCell,
    },
    col("LOGS.TABLE.TIME", {
      accessorKey: "created_at",
      enableHiding: false,
      cell: LogTimeCell,
      size: 180,
    }),
    col("LOGS.TABLE.USER", {
      accessorKey: "username",
      cell: LogUserCell,
      size: 120,
    }),
    col("LOGS.TABLE.TOKEN", {
      accessorKey: "token_name",
      cell: LogTokenNameCell,
      size: 140,
    }),
    col("LOGS.TABLE.MODEL", {
      accessorKey: "model_name",
      cell: LogModelCell,
      size: 260,
    }),
    col("LOGS.TABLE.CLIENT", { id: "client", cell: LogClientCell, size: 150 }),
    col("LOGS.TABLE.STREAM", { id: "stream", cell: LogStreamCell, size: 100 }),
    col("LOGS.TABLE.TOKENS", {
      id: "tokens",
      meta: { headerClassName: "text-right", cellClassName: "text-right" },
      cell: LogTokensCell,
      size: 110,
    }),
    col("LOGS.TABLE.SPEND", {
      accessorKey: "quota",
      cell: LogSpendCell,
      size: 130,
    }),
    col("LOGS.TABLE.TIME_FIRST", {
      id: "timing",
      cell: LogTimingCell,
      size: 130,
    }),
    col("LOGS.TABLE.DETAILS", {
      accessorKey: "content",
      cell: LogPricingDetailsCell,
      size: 180,
      maxSize: 200,
    }),
  ];

  return (
    <LogDetailsContext.Provider
      value={{
        open: (log) => {
          setDetailsLog(log);
          setDetailsOpen(true);
        },
      }}
    >
      {stat && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <StatBadge
            label={t("LOGS.STAT.USAGE")}
            value={renderQuota(stat.quota, 4)}
            accent="bg-sky-500/70"
          />
          <StatBadge
            label={t("LOGS.STAT.RPM")}
            value={stat.rpm}
            accent="bg-rose-500/65"
          />
          <StatBadge
            label={t("LOGS.STAT.TPM")}
            value={stat.tpm.toLocaleString()}
            accent="bg-slate-400/70"
          />
        </div>
      )}
      <DataTable
        id={DataTableId.LOGS}
        data={(logsQuery.data?.items ?? []).filter(
          (item): item is LogRow => item != null,
        )}
        columns={columns}
        total={logsQuery.data?.total ?? 0}
        isLoading={logsQuery.isLoading}
        columnVisibility
        getRowCanExpand={(row) => isConsumeLike(row.original.type)}
        rowClassName={(row) =>
          row.original.type === LOG_TYPE_ERROR
            ? "bg-red-500/4 hover:bg-red-500/7"
            : row.original.type === LOG_TYPE_REFUND
              ? "bg-blue-500/4 hover:bg-blue-500/7"
              : undefined
        }
        renderExpandedRow={(row) => <LogExpandedRow row={row} />}
        filter={() => (
          <LogFilters
            filters={filterValues}
            onFilterChange={filters.handleFilterChange}
            onReset={filters.handleReset}
          />
        )}
        emptyState={<LogsEmptyState />}
      />
      <LogDetailsDialog
        log={detailsLog}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </LogDetailsContext.Provider>
  );
}
