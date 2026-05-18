"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import type { EdenArgs, EdenQuery } from "@/lib/types/eden";
import { DataTableId } from "@/lib/types/enums";
import { handleError, useSimpleMutation } from "@/lib/utils/client";
import type { ResponseDtoPageDataModelTokenData } from "@/openapi";
import { createTableAtoms } from "@/store/data-table-store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { useTranslations } from "next-intl";
import { useAuthQuery } from "./auth-hook";

type TokenRoute = typeof rpc.api.token;

const tokenTableAtoms = createTableAtoms(DataTableId.TOKENS);

function useTokenTableQueryKey() {
  const store = useAtomValue(tokenTableAtoms.baseAtom);
  return queryKeys.tokens({
    p: store.pagination.pageIndex + 1,
    keyword: store.globalFilter || undefined,
  });
}

export function useBestKeyQuery() {
  return useQuery({
    queryKey: queryKeys.bestKey(),
    queryFn: async () => {
      return handleElysia(await rpc.api.token["best-key"].get());
    },
    enabled: false,
    select: (data) => (data?.key ? `sk-${data.key}` : null),
  });
}

export function useTokensQuery(query?: EdenQuery<TokenRoute["search"]>) {
  const authQuery = useAuthQuery();
  return useQuery({
    queryKey: queryKeys.tokens(query),
    queryFn: async () =>
      handleElysia(await rpc.api.token.search.get({ query })),
    enabled: !!authQuery.data,
  });
}

export function useCreateTokenMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const queryKey = useTokenTableQueryKey();
  return useMutation({
    mutationFn: async (args: EdenArgs<TokenRoute, "post">) => {
      return handleElysia(await rpc.api.token.post(args.body));
    },
    onError: (e) => handleError(e, t),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useUpdateTokenMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const queryKey = useTokenTableQueryKey();
  return useMutation({
    mutationFn: async (args: EdenArgs<TokenRoute, "put">) => {
      return handleElysia(await rpc.api.token.put(args.body));
    },
    onError: (e) => handleError(e, t),
    onSuccess: (_, args) => {
      queryClient.setQueryData<ResponseDtoPageDataModelTokenData>(
        queryKey,
        (old) =>
          old
            ? {
                ...old,
                items: (old.items ?? []).map((item) =>
                  item?.id === args.body.id ? { ...item, ...args.body } : item,
                ),
              }
            : old,
      );
    },
  });
}

export function useToggleTokenStatusMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const queryKey = useTokenTableQueryKey();
  return useMutation({
    mutationFn: async (args: EdenArgs<TokenRoute["status"], "put">) => {
      return handleElysia(await rpc.api.token.status.put(args.body));
    },
    onError: (e) => handleError(e, t),
    onSuccess: (_, args) => {
      queryClient.setQueryData<ResponseDtoPageDataModelTokenData>(
        queryKey,
        (old) =>
          old
            ? {
                ...old,
                items: (old.items ?? []).map((item) =>
                  item?.id === args.body.id
                    ? { ...item, status: args.body.status }
                    : item,
                ),
              }
            : old,
      );
    },
  });
}

export function useFetchTokenKeyMutation() {
  return useSimpleMutation(async (args: EdenArgs<TokenRoute, "get">) => {
    return handleElysia(await rpc.api.token(args).key.post());
  });
}

export function useDeleteTokenMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const queryKey = useTokenTableQueryKey();
  return useMutation({
    mutationFn: async (args: EdenArgs<TokenRoute, "delete">) => {
      return handleElysia(await rpc.api.token(args).delete());
    },
    onError: (e) => handleError(e, t),
    onSuccess: (_, args) => {
      queryClient.setQueryData<ResponseDtoPageDataModelTokenData>(
        queryKey,
        (old) =>
          old
            ? {
                ...old,
                total: old.total - 1,
                items: (old.items ?? []).filter(
                  (item) => item?.id !== Number(args.id),
                ),
              }
            : old,
      );
    },
  });
}
