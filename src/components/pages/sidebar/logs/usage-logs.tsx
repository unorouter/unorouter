"use client";

import { DataTable } from "@/components/elements/table/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUsageLogsQuery } from "@/hooks/logs-hook";
import { DataTableId } from "@/lib/types/enums";
import {
  columnFilters as getColumnFilterValues,
  createTableAtoms,
} from "@/store/data-table-store";
import type { ColumnDef, ColumnFiltersState } from "@tanstack/react-table";
import dayjs from "dayjs";
import { useAtomValue, useSetAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  LuFilter,
  LuRefreshCw,
  LuSearch,
  LuX,
} from "react-icons/lu";
import {
  type LogRow,
  LOG_TYPE_CONSUME,
  LOG_TYPE_ERROR,
  LOG_TYPE_MANAGE,
  LOG_TYPE_REFUND,
  LOG_TYPE_SYSTEM,
  LOG_TYPE_TOPUP,
  LogDetailsCell,
  LogEmptyState,
  LogInputTokensCell,
  LogModelCell,
  LogOutputTokensCell,
  LogSpendCell,
  LogTimeCell,
  LogTimingCell,
  LogTokenNameCell,
  LogTypeCell,
  formatDateForInput,
} from "./logs-columns";

type LogFilterValues = {
  start_date?: string;
  end_date?: string;
  log_type?: number;
  token_name?: string;
  model_name?: string;
  request_id?: string;
};

function LogFilters(props: {
  filters: LogFilterValues;
  onFilterChange: (id: string, value: unknown) => void;
  onReset: () => void;
  onRefresh: () => void;
}) {
  const t = useTranslations();
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const todayStr = formatDateForInput(dayjs());
  const startDate = props.filters.start_date ?? todayStr;
  const endDate = props.filters.end_date ?? todayStr;
  const logType = props.filters.log_type;
  const tokenName = props.filters.token_name ?? "";
  const modelName = props.filters.model_name ?? "";
  const requestId = props.filters.request_id ?? "";

  const logTypeOptions = [
    { value: "all", label: t("LOGS.TYPE_ALL") },
    { value: String(LOG_TYPE_CONSUME), label: t("LOGS.TYPE_CONSUME") },
    { value: String(LOG_TYPE_TOPUP), label: t("LOGS.TYPE_TOPUP") },
    { value: String(LOG_TYPE_ERROR), label: t("LOGS.TYPE_ERROR") },
    { value: String(LOG_TYPE_SYSTEM), label: t("LOGS.TYPE_SYSTEM") },
    { value: String(LOG_TYPE_MANAGE), label: t("LOGS.TYPE_MANAGE") },
    { value: String(LOG_TYPE_REFUND), label: t("LOGS.TYPE_REFUND") },
  ];

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="date"
          value={startDate}
          onChange={(e) =>
            props.onFilterChange("start_date", e.target.value || undefined)
          }
          className="h-8 w-36 font-mono text-xs"
        />
        <span className="text-muted-foreground text-xs">{t("LOGS.TO")}</span>
        <Input
          type="date"
          value={endDate}
          onChange={(e) =>
            props.onFilterChange("end_date", e.target.value || undefined)
          }
          className="h-8 w-36 font-mono text-xs"
        />
        <Select
          value={logType != null ? String(logType) : "all"}
          onValueChange={(v) => {
            props.onFilterChange(
              "log_type",
              v === "all" ? undefined : Number(v),
            );
          }}
        >
          <SelectTrigger size="sm" className="w-32">
            <SelectValue>
              {logTypeOptions.find(
                (o) => o.value === (logType != null ? String(logType) : "all"),
              )?.label ?? t("LOGS.TYPE_ALL")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {logTypeOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={props.onReset}>
          {t("LOGS.RESET")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFiltersExpanded(!filtersExpanded)}
        >
          <LuFilter data-icon="inline-start" className="h-3.5 w-3.5" />
          {t("LOGS.FILTERS")}
        </Button>
      </div>

      {filtersExpanded && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <LuSearch className="text-muted-foreground absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2" />
            <Input
              value={tokenName}
              onChange={(e) =>
                props.onFilterChange(
                  "token_name",
                  e.target.value || undefined,
                )
              }
              placeholder={t("LOGS.FILTER_TOKEN")}
              className="h-8 w-40 pl-7 font-mono text-xs"
            />
          </div>
          <div className="relative">
            <LuSearch className="text-muted-foreground absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2" />
            <Input
              value={modelName}
              onChange={(e) =>
                props.onFilterChange(
                  "model_name",
                  e.target.value || undefined,
                )
              }
              placeholder={t("LOGS.FILTER_MODEL")}
              className="h-8 w-40 pl-7 font-mono text-xs"
            />
          </div>
          <div className="relative">
            <LuSearch className="text-muted-foreground absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2" />
            <Input
              value={requestId}
              onChange={(e) =>
                props.onFilterChange(
                  "request_id",
                  e.target.value || undefined,
                )
              }
              placeholder={t("LOGS.FILTER_REQUEST_ID")}
              className="h-8 w-48 pl-7 font-mono text-xs"
            />
          </div>
          {(tokenName || modelName || requestId) && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => {
                props.onFilterChange("token_name", undefined);
                props.onFilterChange("model_name", undefined);
                props.onFilterChange("request_id", undefined);
              }}
            >
              <LuX className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function UsageLogs() {
  const t = useTranslations();

  const tableAtoms = createTableAtoms(DataTableId.LOGS);
  const store = useAtomValue(tableAtoms.baseAtom);
  const setColumnFilters = useSetAtom(tableAtoms.columnFiltersAtom);
  const setPagination = useSetAtom(tableAtoms.paginationAtom);

  const todayStr = formatDateForInput(dayjs());

  // Extract filter values from column filters
  const filterValues =
    getColumnFilterValues<LogFilterValues>(store.columnFilters) ?? {};

  const startDate = filterValues.start_date ?? todayStr;
  const endDate = filterValues.end_date ?? todayStr;

  const queryFilters = {
    p: store.pagination.pageIndex + 1,
    page_size: store.pagination.pageSize,
    ...(filterValues.log_type != null ? { type: filterValues.log_type } : {}),
    ...(startDate ? { start_timestamp: dayjs(startDate).unix() } : {}),
    ...(endDate ? { end_timestamp: dayjs(endDate).unix() + 86400 } : {}),
    ...(filterValues.token_name
      ? { token_name: filterValues.token_name }
      : {}),
    ...(filterValues.model_name
      ? { model_name: filterValues.model_name }
      : {}),
    ...(filterValues.request_id
      ? { request_id: filterValues.request_id }
      : {}),
  };

  const logsQuery = useUsageLogsQuery(queryFilters);

  const pageData = logsQuery.data;
  const logs = (pageData?.items ?? []).filter(
    (item): item is LogRow => item != null,
  );
  const total = pageData?.total ?? 0;

  function handleFilterChange(id: string, value: unknown) {
    setColumnFilters((prev: ColumnFiltersState) => {
      const next = prev.filter((f) => f.id !== id);
      if (value != null) next.push({ id, value });
      return next;
    });
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }

  function handleReset() {
    setColumnFilters([]);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }

  const columns: ColumnDef<LogRow>[] = [
    {
      accessorKey: "created_at",
      meta: { title: "LOGS.COL_TIME" },
      header: t("LOGS.COL_TIME"),
      enableHiding: false,
      enableSorting: false,
      cell: LogTimeCell,
    },
    {
      accessorKey: "type",
      meta: { title: "LOGS.COL_TYPE" },
      header: t("LOGS.COL_TYPE"),
      enableSorting: false,
      cell: LogTypeCell,
    },
    {
      accessorKey: "model_name",
      meta: { title: "LOGS.COL_MODEL" },
      header: t("LOGS.COL_MODEL"),
      enableSorting: false,
      cell: LogModelCell,
    },
    {
      accessorKey: "token_name",
      meta: { title: "LOGS.COL_TOKEN" },
      header: t("LOGS.COL_TOKEN"),
      enableSorting: false,
      cell: LogTokenNameCell,
    },
    {
      id: "input_tokens",
      meta: { title: "LOGS.COL_INPUT", headerClassName: "text-right" },
      header: t("LOGS.COL_INPUT"),
      enableSorting: false,
      cell: LogInputTokensCell,
    },
    {
      id: "output_tokens",
      meta: { title: "LOGS.COL_OUTPUT", headerClassName: "text-right" },
      header: t("LOGS.COL_OUTPUT"),
      enableSorting: false,
      cell: LogOutputTokensCell,
    },
    {
      id: "timing",
      meta: { title: "LOGS.COL_TIME_FIRST" },
      header: t("LOGS.COL_TIME_FIRST"),
      enableSorting: false,
      cell: LogTimingCell,
    },
    {
      accessorKey: "quota",
      meta: { title: "LOGS.COL_SPEND", headerClassName: "text-right" },
      header: t("LOGS.COL_SPEND"),
      enableSorting: false,
      cell: LogSpendCell,
    },
    {
      accessorKey: "content",
      meta: { title: "LOGS.COL_DETAILS" },
      header: t("LOGS.COL_DETAILS"),
      enableSorting: false,
      cell: LogDetailsCell,
    },
  ];

  return (
    <div className="flex w-full flex-1 flex-col gap-0 p-4 md:p-6">
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
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => logsQuery.refetch()}
        >
          <LuRefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <DataTable
        id={DataTableId.LOGS}
        data={logs}
        columns={columns}
        total={total}
        isLoading={logsQuery.isLoading}
        columnVisibility
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
    </div>
  );
}
