"use client";

import { handleError } from "@/lib/utils/client";
import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useTranslations } from "next-intl";

/**
 * The dominant mutation shape: Eden call + i18n error toast, plus optional
 * cache invalidation and success work. Hooks with bespoke onError/optimistic
 * logic keep using useMutation directly.
 */
export function useApiMutation<TData, TVariables = void>(opts: {
  mutationFn: (vars: TVariables) => Promise<TData>;
  /** Query keys invalidated on success. */
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
