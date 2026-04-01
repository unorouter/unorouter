import { buildLogQueryFilters } from "@/components/pages/sidebar/logs/filters";
import { UsageLogs } from "@/components/pages/sidebar/logs/usage-logs";
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
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DataTableProvider data={tableStores}>
        <UsageLogs />
      </DataTableProvider>
    </HydrationBoundary>
  );
}
