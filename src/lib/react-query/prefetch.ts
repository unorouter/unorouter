import { handleElysia } from "@/lib/utils/base";
import { setCookies } from "@/lib/utils/server";
import type { QueryClient } from "@tanstack/react-query";

type ElysiaResult = Parameters<typeof handleElysia>[0];
type CookieHeaders = Awaited<ReturnType<typeof setCookies>>;

/**
 * SSR prefetch of an Eden call; the dominant page-prefetch shape. The request
 * cookie header is resolved once here (React-cached per request) and handed to
 * `call`, so pages no longer thread a `setCookies()` local through every call.
 */
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
