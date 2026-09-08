import { ACCESS_TOKEN_COOKIE } from "@/lib/config/constants";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { serverRequestHeaders } from "@/lib/utils/server";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { cookies } from "next/headers";
import { cache } from "react";

type ElysiaResult = Parameters<typeof handleElysia>[0];
type RequestHeaders = Awaited<ReturnType<typeof serverRequestHeaders>>;

// Layout and page render concurrently, so page prefetches used to fire with a
// dead token before the layout's redirect landed: four 401s per visit. With a
// token cookie present, the (request-deduped) self lookup decides first.
async function sessionUsable(qc: QueryClient): Promise<boolean> {
  if (!(await cookies()).has(ACCESS_TOKEN_COOKIE)) return true;
  await prefetchAuth(qc);
  return qc.getQueryData(queryKeys.auth()) != null;
}

export function prefetchElysia<T extends ElysiaResult>(
  qc: QueryClient,
  queryKey: QueryKey,
  call: (headers: RequestHeaders) => Promise<T>,
) {
  // query() throws where prefetchQuery swallowed; a failed prefetch must stay
  // a cache miss, not a crashed render.
  return qc
    .query({
      queryKey,
      queryFn: async () => {
        if (!(await sessionUsable(qc))) throw new Error("session unusable");
        return handleElysia(await call(await serverRequestHeaders()));
      },
    })
    .catch(() => undefined);
}

// Never route this through prefetchQuery: it discards a throwing queryFn, so a
// 419 leaves no entry and reads as a guest who was never fetched.
export const prefetchAuth = cache(async (qc: QueryClient) => {
  const res = await rpc.api.auth.account.self.get(await serverRequestHeaders());
  qc.setQueryData(queryKeys.auth(), res.status === 200 ? res.data : null);
  const expired = res.status === 419;
  qc.setQueryData(queryKeys.sessionExpired(), expired);
  return expired;
});
