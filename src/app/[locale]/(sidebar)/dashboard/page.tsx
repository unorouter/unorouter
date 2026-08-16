import { prefetchElysia } from "@/lib/react-query/prefetch";
import { Dashboard } from "@/components/pages/sidebar/dashboard/dashboard";
import { getDashboardPerfData } from "@/lib/api/page-data";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { burnRateWindow, defaultTimestamps } from "@/store/dashboard-store";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

export default async function DashboardPage() {
  const queryClient = getQueryClient();

  const { startTs, endTs } = defaultTimestamps();
  const burn = burnRateWindow();
  const burnStartTs = burn.start_timestamp;
  const burnEndTs = burn.end_timestamp;

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
    // useBurnRate runs its own day-aligned 7-day query; without this the tile
    // reads zero rows on first paint and renders a dash.
    prefetchElysia(
      queryClient,
      queryKeys.dashboardQuota({
        start_timestamp: burnStartTs,
        end_timestamp: burnEndTs,
      }),
      (cookies) =>
        rpc.api.billing.dashboard.quota.get({
          ...cookies,
          query: { start_timestamp: burnStartTs, end_timestamp: burnEndTs },
        }),
    ),
  ]);

  return (
    <HydrationBoundary state={await getDashboardPerfData()}>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Dashboard serverTimestamps={{ startTs, endTs }} />
      </HydrationBoundary>
    </HydrationBoundary>
  );
}
