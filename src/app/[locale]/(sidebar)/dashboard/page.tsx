import { Dashboard } from "@/components/pages/dashboard/dashboard";
import { loadDataFromCookie } from "@/lib/config/table-storage";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { StoreId } from "@/lib/types/enums";
import { handleElysia } from "@/lib/utils/base";
import { setCookies } from "@/lib/utils/server";
import {
  defaultTimestamps,
  type DashboardStore,
} from "@/store/dashboard-store";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { cookies } from "next/headers";

export default async function DashboardPage() {
  const queryClient = getQueryClient();
  const cookie = await cookies();
  const cookieHeaders = await setCookies();

  const dashboardStore = loadDataFromCookie<DashboardStore>(
    StoreId.DASHBOARD_STORE,
    cookie,
  );

  const { startTs, endTs } = dashboardStore ?? defaultTimestamps();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.status(),
      queryFn: async () =>
        handleElysia(await rpc.api.auth.status.get(cookieHeaders)),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.dashboardQuota(startTs, endTs),
      queryFn: async () =>
        handleElysia(
          await rpc.api.dashboard.quota.get({
            ...cookieHeaders,
            query: {
              start_timestamp: startTs.toString(),
              end_timestamp: endTs.toString(),
            },
          }),
        ),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.dashboardUptime(),
      queryFn: async () =>
        handleElysia(await rpc.api.dashboard.uptime.get(cookieHeaders)),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Dashboard />
    </HydrationBoundary>
  );
}
