import { handleElysia } from "@/lib/utils/base";
import type { QueryClient } from "@tanstack/react-query";

type ElysiaResult = Parameters<typeof handleElysia>[0];

/** SSR prefetch of an Eden call; the dominant page-prefetch shape. */
export function prefetchElysia<T extends ElysiaResult>(
  qc: QueryClient,
  queryKey: readonly unknown[],
  call: () => Promise<T>,
) {
  return qc.prefetchQuery({
    queryKey: queryKey as unknown[],
    queryFn: async () => handleElysia(await call()),
  });
}
