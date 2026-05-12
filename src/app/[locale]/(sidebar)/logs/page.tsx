import { buildLogQueryFilters } from "@/components/pages/sidebar/logs/common/filters";
import { buildDrawingFilters } from "@/components/pages/sidebar/logs/drawing/drawing-query";
import { LogsShell } from "@/components/pages/sidebar/logs/logs-shell";
import { buildTaskFilters } from "@/components/pages/sidebar/logs/task/task-query";
import { DataTableProvider } from "@/components/provider/state/data-table-provider";
import {
  initialTableStore,
  loadDataFromCookie,
} from "@/lib/config/table-storage";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { DataTableId, StoreId } from "@/lib/types/enums";
import { handleElysia } from "@/lib/utils/base";
import { setCookies } from "@/lib/utils/server";
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
  const drawingTable =
    tableStores?.[DataTableId.MIDJOURNEY_LOGS] || initialTableStore();
  const taskTable = tableStores?.[DataTableId.TASK_LOGS] || initialTableStore();

  const { queryFilters, statFilters } = buildLogQueryFilters(
    logsTable.columnFilters,
    logsTable.pagination,
  );
  const { queryFilters: drawingQueryFilters } = buildDrawingFilters(
    drawingTable.columnFilters,
    drawingTable.pagination,
  );
  const { queryFilters: taskQueryFilters } = buildTaskFilters(
    taskTable.columnFilters,
    taskTable.pagination,
  );

  const serverCookies = await setCookies();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.usageLogs(queryFilters),
      queryFn: async () =>
        handleElysia(
          await rpc.api.logs.get({
            query: queryFilters,
            ...serverCookies,
          }),
        ),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.usageLogsStat(statFilters),
      queryFn: async () =>
        handleElysia(
          await rpc.api.logs.stat.get({
            query: statFilters,
            ...serverCookies,
          }),
        ),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.midjourneyLogs(drawingQueryFilters),
      queryFn: async () =>
        handleElysia(
          await rpc.api.logs.midjourney.get({
            query: drawingQueryFilters,
            ...serverCookies,
          }),
        ),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.taskLogs(taskQueryFilters),
      queryFn: async () =>
        handleElysia(
          await rpc.api.logs.task.get({
            query: taskQueryFilters,
            ...serverCookies,
          }),
        ),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DataTableProvider data={tableStores}>
        <LogsShell />
      </DataTableProvider>
    </HydrationBoundary>
  );
}
