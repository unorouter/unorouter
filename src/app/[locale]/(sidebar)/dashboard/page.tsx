import { prefetchElysia } from "@/lib/react-query/prefetch";
import { Dashboard } from "@/components/pages/sidebar/dashboard/dashboard";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { defaultTimestamps } from "@/store/dashboard-store";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { cookies } from "next/headers";

export default async function DashboardPage() {
  // Request data before the clock: prerender rejects Date.now on a path that
  // has not yet proven itself request-bound.
  await cookies();
  const queryClient = getQueryClient();

  const { startTs, endTs } = defaultTimestamps();

  await Promise.all([
    prefetchElysia(queryClient, queryKeys.auth(), (cookies) =>
      rpc.api.auth.account.self.get(cookies),
    ),
    prefetchElysia(queryClient, queryKeys.status(), (cookies) =>
      rpc.api.auth.account.status.get(cookies),
    ),
    prefetchElysia(
      queryClient,
      queryKeys.dashboardQuota({
        start_timestamp: startTs,
        end_timestamp: endTs,
      }),
      (cookies) =>
        rpc.api.billing.dashboard.quota.get({
          ...cookies,
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
