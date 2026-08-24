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

// Never route this through prefetchQuery: it discards a throwing queryFn, so a
// 419 leaves no entry and reads as a guest who was never fetched.
export async function prefetchAuth(qc: QueryClient) {
  const res = await rpc.api.auth.account.self.get(await setCookies());
  qc.setQueryData(queryKeys.auth(), res.status === 200 ? res.data : null);
  const expired = res.status === 419;
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
