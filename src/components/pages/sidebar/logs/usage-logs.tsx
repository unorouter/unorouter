"use client";

import { PageContent } from "@/components/layout/sidebar/sidebar-layout";
import { DataTable } from "@/components/elements/table/data-table";
import { buildLogQueryFilters } from "@/components/pages/sidebar/logs/filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUsageLogsQuery, useUsageLogsStatQuery } from "@/hooks/logs-hook";
import { analytics } from "@/lib/analytics";
import { msg, renderQuota } from "@/lib/config/constants";
import { DataTableId } from "@/lib/types/enums";
import { createTableAtoms } from "@/store/data-table-store";
import type { ColumnDef, ColumnFiltersState } from "@tanstack/react-table";
import { useAtomValue, useSetAtom } from "jotai";
import { useTranslations } from "next-intl";
import { LuRefreshCw } from "react-icons/lu";
import type { LogRow } from "./log-helpers";
import {
  LogDetailsCell,
  LogExpandToggleCell,
  LogInputTokensCell,
  LogModelCell,
  LogOutputTokensCell,
  LogSpendCell,
  LogTimeCell,
  LogTimingCell,
  LogTokenNameCell,
  LogTypeCell,
} from "./log-cells";
import { canLogRowExpand, LogExpandedRow } from "./log-expanded-row";
import { LogEmptyState, LogFilters } from "./log-filters";

export function UsageLogs() {
  const t = useTranslations();

  const tableAtoms = createTableAtoms(DataTableId.LOGS);
  const store = useAtomValue(tableAtoms.baseAtom);
  const setColumnFilters = useSetAtom(tableAtoms.columnFiltersAtom);
  const setPagination = useSetAtom(tableAtoms.paginationAtom);

  const { filterValues, queryFilters, statFilters } = buildLogQueryFilters(
    store.columnFilters,
    store.pagination,
  );

  const logsQuery = useUsageLogsQuery({ query: queryFilters });
  const statQuery = useUsageLogsStatQuery({ query: statFilters });
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
      accessorKey: "type",
      meta: { title: msg("LOGS.TABLE.TYPE") },
      header: t("LOGS.TABLE.TYPE"),
      enableSorting: false,
      cell: LogTypeCell,
    },
    {
      accessorKey: "model_name",
      meta: { title: msg("LOGS.TABLE.MODEL") },
      header: t("LOGS.TABLE.MODEL"),
      enableSorting: false,
      cell: LogModelCell,
    },
    {
      accessorKey: "token_name",
      meta: { title: msg("LOGS.TABLE.TOKEN") },
      header: t("LOGS.TABLE.TOKEN"),
      enableSorting: false,
      cell: LogTokenNameCell,
    },
    {
      id: "input_tokens",
      meta: {
        title: msg("LOGS.TABLE.INPUT"),
        headerClassName: "text-right",
        cellClassName: "text-right",
      },
      header: t("LOGS.TABLE.INPUT"),
      enableSorting: false,
      cell: LogInputTokensCell,
    },
    {
      id: "output_tokens",
      meta: {
        title: msg("LOGS.TABLE.OUTPUT"),
        headerClassName: "text-right",
        cellClassName: "text-right",
      },
      header: t("LOGS.TABLE.OUTPUT"),
      enableSorting: false,
      cell: LogOutputTokensCell,
    },
    {
      id: "timing",
      meta: { title: msg("LOGS.TABLE.TIME_FIRST") },
      header: t("LOGS.TABLE.TIME_FIRST"),
      enableSorting: false,
      cell: LogTimingCell,
    },
    {
      accessorKey: "quota",
      meta: {
        title: msg("LOGS.TABLE.SPEND"),
        headerClassName: "text-right",
        cellClassName: "text-right",
      },
      header: t("LOGS.TABLE.SPEND"),
      enableSorting: false,
      cell: LogSpendCell,
    },
    {
      accessorKey: "content",
      meta: { title: msg("LOGS.TABLE.DETAILS") },
      header: t("LOGS.TABLE.DETAILS"),
      enableSorting: false,
      cell: LogDetailsCell,
    },
  ];

  return (
    <PageContent>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
            <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
              {t("LOGS.TITLE")}
            </span>
          </div>
          <h1 className="text-foreground mt-1 text-xl font-bold tracking-tight md:text-2xl">
            {t("LOGS.TITLE")}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("LOGS.DESCRIPTION")}
          </p>
          {stat && (
            <div className="mt-3 flex items-center gap-2">
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
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            analytics.logs.refreshed();
            logsQuery.refetch();
          }}
        >
          <LuRefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <DataTable
        id={DataTableId.LOGS}
        data={(logsQuery.data?.items ?? []).filter(
          (item): item is LogRow => item != null,
        )}
        columns={columns}
        total={logsQuery.data?.total ?? 0}
        isLoading={logsQuery.isLoading}
        columnVisibility
        getRowCanExpand={canLogRowExpand}
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
    </PageContent>
  );
}
