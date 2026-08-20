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

// fetchQuery, not prefetchQuery like its siblings: prefetchQuery discards a
// throwing queryFn, so /self's 419 would vanish and leave no cache entry,
// which reads the same as a guest who was never fetched.
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
