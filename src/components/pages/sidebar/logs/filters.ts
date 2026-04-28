import type { ColumnFiltersState } from "@tanstack/react-table";
import dayjs from "dayjs";
import { columnFilters as getColumnFilterValues } from "@/store/data-table-store";
import type { GetLogsStatParams, GetUserLogsParams } from "@/openapi";

export type LogFilterValues = {
  start_date?: string;
  end_date?: string;
  log_type?: number;
  token_name?: string;
  model_name?: string;
  request_id?: string;
  subscription_plan?: string;
};

export function buildLogQueryFilters(
  columnFilters: ColumnFiltersState,
  pagination: { pageIndex: number; pageSize: number },
) {
  const filterValues =
    getColumnFilterValues<LogFilterValues>(columnFilters) ?? {};

  const startDate =
    filterValues.start_date ??
    dayjs().startOf("day").format("YYYY-MM-DDTHH:mm");
  const endDate =
    filterValues.end_date ?? dayjs().endOf("day").format("YYYY-MM-DDTHH:mm");

  const queryFilters: GetUserLogsParams = {
    p: pagination.pageIndex + 1,
    page_size: pagination.pageSize,
    ...(filterValues.log_type != null ? { type: filterValues.log_type } : {}),
    ...(startDate ? { start_timestamp: dayjs(startDate).unix() } : {}),
    ...(endDate ? { end_timestamp: dayjs(endDate).unix() } : {}),
    ...(filterValues.token_name ? { token_name: filterValues.token_name } : {}),
    ...(filterValues.model_name ? { model_name: filterValues.model_name } : {}),
    ...(filterValues.request_id ? { request_id: filterValues.request_id } : {}),
    ...(filterValues.subscription_plan
      ? { subscription_plan: filterValues.subscription_plan }
      : {}),
  };

  const statFilters: GetLogsStatParams = {
    ...(filterValues.log_type != null ? { type: filterValues.log_type } : {}),
    ...(startDate ? { start_timestamp: dayjs(startDate).unix() } : {}),
    ...(endDate ? { end_timestamp: dayjs(endDate).unix() } : {}),
    ...(filterValues.token_name ? { token_name: filterValues.token_name } : {}),
    ...(filterValues.model_name ? { model_name: filterValues.model_name } : {}),
  };

  return { filterValues, queryFilters, statFilters };
}
