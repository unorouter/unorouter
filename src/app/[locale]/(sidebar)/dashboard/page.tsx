import { prefetchElysia } from "@/lib/react-query/prefetch";
import { Dashboard } from "@/components/pages/sidebar/dashboard/dashboard";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { setCookies } from "@/lib/utils/server";
import { defaultTimestamps } from "@/store/dashboard-store";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

export default async function DashboardPage() {
  const queryClient = getQueryClient();
  const cookieHeaders = await setCookies();

  const { startTs, endTs } = defaultTimestamps();

  await Promise.all([
    prefetchElysia(queryClient, queryKeys.status(), () =>
      rpc.api.auth.account.status.get(cookieHeaders),
    ),
    prefetchElysia(
      queryClient,
      queryKeys.dashboardQuota({
        start_timestamp: startTs,
        end_timestamp: endTs,
      }),
      () =>
        rpc.api.billing.dashboard.quota.get({
          ...cookieHeaders,
          query: { start_timestamp: startTs, end_timestamp: endTs },
        }),
    ),
    prefetchElysia(queryClient, queryKeys.dashboardUptime(), () =>
      rpc.api.billing.dashboard.uptime.get(cookieHeaders),
    ),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Dashboard serverTimestamps={{ startTs, endTs }} />
    </HydrationBoundary>
  );
}
