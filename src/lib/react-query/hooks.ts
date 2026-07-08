"use client";

import { handleElysia } from "@/lib/utils/base";
import { handleError } from "@/lib/utils/client";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { useTranslations } from "next-intl";

export function useApiMutation<TData, TVariables = void>(opts: {
  mutationFn: (vars: TVariables) => Promise<TData>;
  invalidates?:
    | readonly (readonly unknown[])[]
    | ((vars: TVariables, data: TData) => readonly (readonly unknown[])[]);
  onSuccess?: (data: TData, vars: TVariables, qc: QueryClient) => void;
}) {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: opts.mutationFn,
    onError: (e) => handleError(e, t),
    onSuccess: (data, vars) => {
      const keys =
        typeof opts.invalidates === "function"
          ? opts.invalidates(vars, data)
          : (opts.invalidates ?? []);
      for (const key of keys) {
        qc.invalidateQueries({ queryKey: key as unknown[] });
      }
      opts.onSuccess?.(data, vars, qc);
    },
  });
}

type ElysiaResult = Parameters<typeof handleElysia>[0];

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
