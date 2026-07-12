import { handleElysia } from "@/lib/utils/base";
import { setCookies } from "@/lib/utils/server";
import { dehydrate, type QueryClient } from "@tanstack/react-query";

type ElysiaResult = Parameters<typeof handleElysia>[0];
type CookieHeaders = Awaited<ReturnType<typeof setCookies>>;

export function prefetchElysia<T extends ElysiaResult>(
  qc: QueryClient,
  queryKey: readonly unknown[],
  call: (cookies: CookieHeaders) => Promise<T>,
) {
  return qc.prefetchQuery({
    queryKey: queryKey as unknown[],
    queryFn: async () => handleElysia(await call(await setCookies())),
  });
}

// Server prefetches feed a Suspense shell; a single stalled upstream must not
// suspend the whole page forever. Callers race the prefetch against a deadline
// and settle all of them, so a slow query just falls back to a client refetch.
export function prefetchAllSettled(
  prefetches: Promise<unknown>[],
  timeoutMs = 6000,
) {
  const withDeadline = prefetches.map((p) =>
    Promise.race([p, new Promise((resolve) => setTimeout(resolve, timeoutMs))]),
  );
  return Promise.allSettled(withDeadline);
}

// Dehydrate only the given query keys. Layout-level HydrationBoundaries share
// the per-request queryClient with the page, so a plain dehydrate() re-ships
// every page query (the models flight payload carried pricing 3x, once per
// boundary). Scope each boundary to the keys it prefetched itself.
export function dehydrateOnly(
  qc: QueryClient,
  keys: readonly (readonly unknown[])[],
) {
  const allowed = new Set(keys.map((k) => JSON.stringify(k)));
  return dehydrate(qc, {
    shouldDehydrateQuery: (query) =>
      query.state.status === "success" &&
      allowed.has(JSON.stringify(query.queryKey)),
  });
}
