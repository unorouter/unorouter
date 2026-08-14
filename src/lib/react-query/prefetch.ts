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
