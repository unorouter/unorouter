"use client";

import { DataTable } from "@/components/elements/table/data-table";
import { buildLogQueryFilters } from "@/components/pages/sidebar/logs/common/log-helpers";
import {
  useUsageLogsQuery,
  useUsageLogsStatQuery,
} from "@/hooks/ops/logs-hook";
import { analytics } from "@/lib/analytics";
import { msg, renderQuota } from "@/lib/config/constants";
import { DataTableId } from "@/lib/types/enums";
import { createTableAtoms } from "@/store/data-table-store";
import type { ColumnDef, ColumnFiltersState } from "@tanstack/react-table";
import type { TableFeats } from "@/lib/config/table-features";
import { useAtomValue, useSetAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
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
import { LogEmptyState, LogFilters } from "./log-filters";
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

  const tableAtoms = createTableAtoms(DataTableId.LOGS);
  const store = useAtomValue(tableAtoms.baseAtom);
  const setColumnFilters = useSetAtom(tableAtoms.columnFiltersAtom);
  const setPagination = useSetAtom(tableAtoms.paginationAtom);

  const { filterValues, queryFilters, statFilters } = buildLogQueryFilters(
    store.columnFilters,
    store.pagination,
  );

  const logsQuery = useUsageLogsQuery(queryFilters);
  const statQuery = useUsageLogsStatQuery(statFilters);
  const stat = statQuery.data;

  function handleFilterChange(id: string, value: unknown) {
    analytics.logs.filterChanged({
      filter_id: id,
      has_value: value != null,
    });
    setColumnFilters((prev: ColumnFiltersState) => {
      const next = prev.filter((f) => f.id !== id);
      if (value != null) next.push({ id, value });
      return next;
    });
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }

  function handleReset() {
    analytics.logs.filtersReset();
    setColumnFilters([]);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }

  const columns: ColumnDef<TableFeats, LogRow>[] = [
    {
      id: "expand",
      header: "",
      enableHiding: false,
      enableSorting: false,
      meta: { cellClassName: "w-8 px-1" },
      cell: LogExpandToggleCell,
    },
    {
      accessorKey: "created_at",
      meta: { title: msg("LOGS.TABLE.TIME") },
      header: t("LOGS.TABLE.TIME"),
      enableHiding: false,
      enableSorting: false,
      cell: LogTimeCell,
      size: 180,
    },
    {
      accessorKey: "username",
      meta: { title: msg("LOGS.TABLE.USER") },
      header: t("LOGS.TABLE.USER"),
      enableSorting: false,
      cell: LogUserCell,
      size: 120,
    },
    {
      accessorKey: "token_name",
      meta: { title: msg("LOGS.TABLE.TOKEN") },
      header: t("LOGS.TABLE.TOKEN"),
      enableSorting: false,
      cell: LogTokenNameCell,
      size: 140,
    },
    {
      accessorKey: "model_name",
      meta: { title: msg("LOGS.TABLE.MODEL") },
      header: t("LOGS.TABLE.MODEL"),
      enableSorting: false,
      cell: LogModelCell,
      size: 260,
    },
    {
      id: "stream",
      meta: { title: msg("LOGS.TABLE.STREAM") },
      header: t("LOGS.TABLE.STREAM"),
      enableSorting: false,
      cell: LogStreamCell,
      size: 100,
    },
    {
      id: "tokens",
      meta: {
        title: msg("LOGS.TABLE.TOKENS"),
        headerClassName: "text-right",
        cellClassName: "text-right",
      },
      header: t("LOGS.TABLE.TOKENS"),
      enableSorting: false,
      cell: LogTokensCell,
      size: 110,
    },
    {
      accessorKey: "quota",
      meta: { title: msg("LOGS.TABLE.SPEND") },
      header: t("LOGS.TABLE.SPEND"),
      enableSorting: false,
      cell: LogSpendCell,
      size: 130,
    },
    {
      id: "timing",
      meta: { title: msg("LOGS.TABLE.TIME_FIRST") },
      header: t("LOGS.TABLE.TIME_FIRST"),
      enableSorting: false,
      cell: LogTimingCell,
      size: 130,
    },
    {
      accessorKey: "content",
      meta: { title: msg("LOGS.TABLE.DETAILS") },
      header: t("LOGS.TABLE.DETAILS"),
      enableSorting: false,
      cell: LogPricingDetailsCell,
      size: 180,
      maxSize: 200,
    },
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
            onFilterChange={handleFilterChange}
            onReset={handleReset}
            onRefresh={() => logsQuery.refetch()}
          />
        )}
        emptyState={<LogEmptyState />}
      />
      <LogDetailsDialog
        log={detailsLog}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </LogDetailsContext.Provider>
  );
}
