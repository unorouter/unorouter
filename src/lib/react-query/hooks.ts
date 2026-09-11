"use client";

import { handleElysia } from "@/lib/utils/base";
import { handleError } from "@/lib/utils/client";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
  type UseQueryOptions,
} from "@tanstack/react-query";
import type { TranslationKey } from "@/lib/config/constants";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export function useApiMutation<TData, TVariables = void>(opts: {
  mutationFn: (vars: TVariables) => Promise<TData>;
  invalidates?:
    | readonly QueryKey[]
    | ((vars: TVariables, data: TData) => readonly QueryKey[]);
  // A save that writes to the local database closes nothing and moves nothing,
  // so without this it is indistinguishable from a button that did not work.
  successKey?: TranslationKey;
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
      for (const queryKey of keys) qc.invalidateQueries({ queryKey });
      if (opts.successKey) toast.success(t(opts.successKey));
      opts.onSuccess?.(data, vars, qc);
    },
  });
}

type ElysiaResult = Parameters<typeof handleElysia>[0];
type Unwrapped<T extends ElysiaResult> = ReturnType<typeof handleElysia<T>>;

export function useElysiaQuery<
  T extends ElysiaResult,
  TSelected = Unwrapped<T>,
>(
  queryKey: QueryKey,
  call: () => Promise<T>,
  options?: Omit<
    UseQueryOptions<Unwrapped<T>, Error, TSelected>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey,
    queryFn: async () => handleElysia(await call()),
    ...options,
  });
}
