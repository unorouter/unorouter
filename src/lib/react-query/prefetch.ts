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

// Seeds the cache by hand rather than through prefetchQuery, which discards a
// throwing queryFn: /self's 419 would vanish and leave no entry, which reads
// the same as a guest who was never fetched. A failure must never land in the
// cache as error state either, since dehydrate() would then try to serialize
// the Eden response object and RSC rejects its Response/Headers prototypes.
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
