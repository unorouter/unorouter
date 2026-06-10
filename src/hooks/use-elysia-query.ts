"use client";

import { handleElysia } from "@/lib/utils/base";
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";

type ElysiaResult = Parameters<typeof handleElysia>[0];

/** The dominant query shape: key + Eden call, optional react-query options. */
export function useElysiaQuery<
  T extends ElysiaResult,
  TSelected = ReturnType<typeof handleElysia<T>>,
>(
  queryKey: readonly unknown[],
  call: () => Promise<T>,
  options?: Omit<
    UseQueryOptions<ReturnType<typeof handleElysia<T>>, Error, TSelected>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: queryKey as unknown[],
    queryFn: async () => handleElysia(await call()),
    ...options,
  });
}
