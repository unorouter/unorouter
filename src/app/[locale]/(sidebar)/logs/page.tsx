import { prefetchAuth, prefetchElysia } from "@/lib/react-query/prefetch";
import { buildLogQueryFilters } from "@/components/pages/sidebar/logs/common/log-helpers";
import { LogsShell } from "@/components/pages/sidebar/logs/logs-shell";
import { buildTaskFilters } from "@/components/pages/sidebar/logs/task/task-helpers";
import { DataTableProvider } from "@/components/provider/state/data-table-provider";
import {
  initialTableStore,
  loadDataFromCookie,
} from "@/lib/config/table-storage";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { DataTableId, StoreId } from "@/lib/types/enums";
import type { DataTableStores } from "@/store/data-table-store";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { cookies } from "next/headers";

export default async function LogsPage() {
  const queryClient = getQueryClient();
  const cookie = await cookies();

  const tableStores = loadDataFromCookie<DataTableStores>(
    StoreId.DATA_TABLES_STORE,
    cookie,
  );

  const logsTable = tableStores?.[DataTableId.LOGS] || initialTableStore();
  const taskTable = tableStores?.[DataTableId.TASK_LOGS] || initialTableStore();

  const { queryFilters, statFilters } = buildLogQueryFilters(
    logsTable.columnFilters,
    logsTable.pagination,
  );
  const { queryFilters: taskQueryFilters } = buildTaskFilters(
    taskTable.columnFilters,
    taskTable.pagination,
  );

  await Promise.all([
    prefetchAuth(queryClient),
    prefetchElysia(queryClient, queryKeys.usageLogs(queryFilters), (headers) =>
      rpc.api.ops.logs.get({
        query: queryFilters,
        ...headers,
      }),
    ),
    prefetchElysia(
      queryClient,
      queryKeys.usageLogsStat(statFilters),
      (headers) =>
        rpc.api.ops.logs.stat.get({
          query: statFilters,
          ...headers,
        }),
    ),
    prefetchElysia(
      queryClient,
      queryKeys.taskLogs(taskQueryFilters),
      (headers) =>
        rpc.api.ops.logs.task.get({
          query: taskQueryFilters,
          ...headers,
        }),
    ),
    prefetchElysia(queryClient, queryKeys.pricingVendors(), () =>
      rpc.api.models.pricing.vendors.get(),
    ),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DataTableProvider data={tableStores}>
        <LogsShell />
      </DataTableProvider>
    </HydrationBoundary>
  );
}
