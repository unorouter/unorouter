import { UsageLogs } from "@/components/pages/sidebar/logs/usage-logs";
import { DataTableProvider } from "@/components/provider/data-table-provider";
import { initialTableStore, loadDataFromCookie } from "@/lib/config/table-storage";
import { buildLogQueryFilters } from "@/lib/logs/filters";
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

  const logsTable =
    tableStores?.[DataTableId.LOGS] || initialTableStore();

  const { queryFilters, statFilters } = buildLogQueryFilters(
    logsTable.columnFilters,
    logsTable.pagination,
  );

  const serverCookies = await setCookies();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.usageLogs(queryFilters),
      queryFn: async () =>
        handleElysia(
          await rpc.api.logs.get({
            query: {
              p: queryFilters.p?.toString(),
              page_size: queryFilters.page_size?.toString(),
              type: queryFilters.type?.toString(),
              start_timestamp: queryFilters.start_timestamp?.toString(),
              end_timestamp: queryFilters.end_timestamp?.toString(),
              token_name: queryFilters.token_name || undefined,
              model_name: queryFilters.model_name || undefined,
              request_id: queryFilters.request_id || undefined,
            },
            ...serverCookies,
          }),
        ),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.usageLogsStat(statFilters),
      queryFn: async () =>
        handleElysia(
          await rpc.api.logs.stat.get({
            query: {
              type: statFilters.type?.toString(),
              start_timestamp: statFilters.start_timestamp?.toString(),
              end_timestamp: statFilters.end_timestamp?.toString(),
              token_name: statFilters.token_name || undefined,
              model_name: statFilters.model_name || undefined,
            },
            ...serverCookies,
          }),
        ),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DataTableProvider data={tableStores}>
        <UsageLogs />
      </DataTableProvider>
    </HydrationBoundary>
  );
}
