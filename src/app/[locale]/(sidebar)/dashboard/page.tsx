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
    prefetchElysia(queryClient, queryKeys.status(), (cookies) =>
      rpc.api.auth.account.status.get(cookies),
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
    prefetchElysia(queryClient, queryKeys.dashboardUptime(), (cookies) =>
      rpc.api.billing.dashboard.uptime.get(cookies),
    ),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Dashboard serverTimestamps={{ startTs, endTs }} />
    </HydrationBoundary>
  );
}
