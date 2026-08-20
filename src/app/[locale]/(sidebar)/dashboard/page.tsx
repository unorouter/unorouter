import { prefetchAuth, prefetchElysia } from "@/lib/react-query/prefetch";
import { Dashboard } from "@/components/pages/sidebar/dashboard/dashboard";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { burnRateWindow, defaultTimestamps } from "@/store/dashboard-store";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

export default async function DashboardPage() {
  const queryClient = getQueryClient();

  const quota = defaultTimestamps();
  const burn = burnRateWindow();

  await Promise.all([
    prefetchAuth(queryClient),
    prefetchElysia(queryClient, queryKeys.status(), (cookies) =>
      rpc.api.auth.account.status.get(cookies),
    ),
    prefetchElysia(queryClient, queryKeys.perfMetricsSummary(24), () =>
      rpc.api.models["perf-metrics"].summary.get({ query: { hours: 24 } }),
    ),
    prefetchElysia(queryClient, queryKeys.dashboardQuota(quota), (cookies) =>
      rpc.api.billing.dashboard.quota.get({ ...cookies, query: quota }),
    ),
    // useBurnRate runs its own day-aligned 7-day query; without this the tile
    // reads zero rows on first paint and renders a dash.
    prefetchElysia(queryClient, queryKeys.dashboardQuota(burn), (cookies) =>
      rpc.api.billing.dashboard.quota.get({ ...cookies, query: burn }),
    ),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Dashboard serverTimestamps={quota} />
    </HydrationBoundary>
  );
}
