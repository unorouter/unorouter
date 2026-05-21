"use client";

import { DataTable } from "@/components/elements/table/data-table";
import { buildLogQueryFilters } from "@/components/pages/sidebar/logs/common/log-helpers";
import { Badge } from "@/components/ui/badge";
import {
  useUsageLogsQuery,
  useUsageLogsStatQuery,
} from "@/hooks/ops/logs-hook";
import { analytics } from "@/lib/analytics";
import { msg, renderQuota } from "@/lib/config/constants";
import { DataTableId } from "@/lib/types/enums";
import { createTableAtoms } from "@/store/data-table-store";
import type { ColumnDef, ColumnFiltersState } from "@tanstack/react-table";
import { useAtomValue, useSetAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  LogChannelCell,
  LogDetailsContext,
  LogExpandToggleCell,
  LogModelCell,
  LogPricingDetailsCell,
  LogSpendCell,
  LogTimeCell,
  LogTimingCell,
  LogTokenNameCell,
  LogTokensCell,
  LogUserCell,
} from "./log-cells";
import { LogDetailsDialog } from "./log-details-dialog";
import { LogExpandedRow } from "./log-expanded-row";
import { LogEmptyState, LogFilters } from "./log-filters";
import { isConsumeLike, type LogRow } from "./log-helpers";

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

  const columns: ColumnDef<LogRow>[] = [
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
    },
    {
      accessorKey: "channel",
      meta: { title: msg("LOGS.TABLE.CHANNEL") },
      header: t("LOGS.TABLE.CHANNEL"),
      enableSorting: false,
      cell: LogChannelCell,
    },
    {
      accessorKey: "username",
      meta: { title: msg("LOGS.TABLE.USER") },
      header: t("LOGS.TABLE.USER"),
      enableSorting: false,
      cell: LogUserCell,
    },
    {
      accessorKey: "token_name",
      meta: { title: msg("LOGS.TABLE.TOKEN") },
      header: t("LOGS.TABLE.TOKEN"),
      enableSorting: false,
      cell: LogTokenNameCell,
    },
    {
      accessorKey: "model_name",
      meta: { title: msg("LOGS.TABLE.MODEL") },
      header: t("LOGS.TABLE.MODEL"),
      enableSorting: false,
      cell: LogModelCell,
    },
    {
      id: "timing",
      meta: { title: msg("LOGS.TABLE.TIME_FIRST") },
      header: t("LOGS.TABLE.TIME_FIRST"),
      enableSorting: false,
      cell: LogTimingCell,
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
    },
    {
      accessorKey: "quota",
      meta: { title: msg("LOGS.TABLE.SPEND") },
      header: t("LOGS.TABLE.SPEND"),
      enableSorting: false,
      cell: LogSpendCell,
    },
    {
      accessorKey: "content",
      meta: { title: msg("LOGS.TABLE.DETAILS") },
      header: t("LOGS.TABLE.DETAILS"),
      enableSorting: false,
      cell: LogPricingDetailsCell,
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
        <div className="mb-3 flex items-center gap-2">
          <Badge
            variant="secondary"
            className="bg-blue-500/10 font-mono text-blue-400"
          >
            {t("LOGS.STAT.USED_QUOTA")}: {renderQuota(stat.quota, 2)}
          </Badge>
          <Badge
            variant="secondary"
            className="bg-pink-500/10 font-mono text-pink-400"
          >
            RPM: {stat.rpm}
          </Badge>
          <Badge
            variant="secondary"
            className="bg-purple-500/10 font-mono text-purple-400"
          >
            TPM: {stat.tpm.toLocaleString()}
          </Badge>
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
