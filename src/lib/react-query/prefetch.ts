import { handleElysia } from "@/lib/utils/base";
import { setCookies } from "@/lib/utils/server";
import type { QueryClient } from "@tanstack/react-query";

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
