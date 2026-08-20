import { isUpstreamError } from "@/lib/custom-fetch";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { setCookies } from "@/lib/utils/server";
import type { QueryClient, QueryKey } from "@tanstack/react-query";

type ElysiaResult = Parameters<typeof handleElysia>[0];
type CookieHeaders = Awaited<ReturnType<typeof setCookies>>;

export function prefetchElysia<T extends ElysiaResult>(
  qc: QueryClient,
  queryKey: QueryKey,
  call: (cookies: CookieHeaders) => Promise<T>,
) {
  return qc.prefetchQuery({
    queryKey,
    queryFn: async () => handleElysia(await call(await setCookies())),
  });
}

// The one auth prefetch every layout uses, because a bare prefetchElysia
// cannot report an expired session: prefetchQuery DISCARDS a throwing queryFn,
// so /self's 419 vanishes and the cache is left with no entry at all, which is
// indistinguishable from a guest who was never fetched. Seeding
// sessionExpired() is what turns the client auth query on so it re-checks
// instead of rendering a stale logged-in shell whose every action 401s.
export async function prefetchAuth(qc: QueryClient) {
  let expired = false;
  try {
    await qc.fetchQuery({
      queryKey: queryKeys.auth(),
      queryFn: async () =>
        handleElysia(await rpc.api.auth.account.self.get(await setCookies())),
    });
  } catch (err) {
    expired = isUpstreamError(err) && err.status === 419;
    qc.setQueryData(queryKeys.auth(), null);
  }
  qc.setQueryData(queryKeys.sessionExpired(), expired);
  return expired;
}

export function fetchElysia<T extends ElysiaResult>(
  qc: QueryClient,
  queryKey: QueryKey,
  call: (cookies: CookieHeaders) => Promise<T>,
) {
  return qc.fetchQuery({
    queryKey,
    queryFn: async () => handleElysia(await call(await setCookies())),
  });
}
