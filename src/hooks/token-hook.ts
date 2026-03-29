"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenArgs } from "@/lib/types/eden";
import { DataTableId } from "@/lib/types/enums";
import { handleElysia } from "@/lib/utils/base";
import type { ResponseDtoPageDataModelTokenData } from "@/openapi";
import { createTableAtoms } from "@/store/data-table-store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { useAuthQuery } from "./auth-hook";

const tokenRoute = rpc.api.token;

const tokenTableAtoms = createTableAtoms(DataTableId.TOKENS);

function useTokenTableQueryKey() {
  const store = useAtomValue(tokenTableAtoms.baseAtom);
  return queryKeys.tokens({
    p: store.pagination.pageIndex + 1,
    keyword: store.globalFilter || undefined,
  });
}

export function useTokensQuery(
  args: EdenArgs<typeof tokenRoute.search, "get"> = {},
) {
  const authQuery = useAuthQuery();
  return useQuery({
    queryKey: queryKeys.tokens(args.query),
    queryFn: async () =>
      handleElysia(await rpc.api.token.search.get({ query: args.query })),
    enabled: !!authQuery.data,
  });
}

export function useTokenQuery(args: EdenArgs<typeof rpc.api.token, "get">) {
  return useQuery({
    queryKey: queryKeys.token(args.id),
    queryFn: async () => handleElysia(await rpc.api.token(args).get()),
    enabled: Number(args.id) > 0,
  });
}

export function useUserGroupsQuery() {
  return useQuery({
    queryKey: queryKeys.userGroups(),
    queryFn: async () => handleElysia(await rpc.api.token.user.groups.get()),
  });
}

export function useUserModelsQuery() {
  return useQuery({
    queryKey: queryKeys.userModels(),
    queryFn: async () => handleElysia(await rpc.api.token.user.models.get()),
  });
}

export function useCreateTokenMutation() {
  const queryClient = useQueryClient();
  const queryKey = useTokenTableQueryKey();
  return useMutation({
    mutationFn: async (args: EdenArgs<typeof tokenRoute, "post">) =>
      handleElysia(await rpc.api.token.post(args.body)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useUpdateTokenMutation() {
  const queryClient = useQueryClient();
  const queryKey = useTokenTableQueryKey();
  return useMutation({
    mutationFn: async (args: EdenArgs<typeof tokenRoute, "put">) =>
      handleElysia(await rpc.api.token.put(args.body)),
    onSuccess: (_, args) => {
      queryClient.setQueryData<ResponseDtoPageDataModelTokenData>(
        queryKey,
        (old) =>
          old
            ? {
                ...old,
                items: old.items.map((item) =>
                  item?.id === args.body.id ? { ...item, ...args.body } : item,
                ),
              }
            : old,
      );
    },
  });
}

export function useToggleTokenStatusMutation() {
  const queryClient = useQueryClient();
  const queryKey = useTokenTableQueryKey();
  return useMutation({
    mutationFn: async (args: EdenArgs<typeof tokenRoute.status, "put">) =>
      handleElysia(await rpc.api.token.status.put(args.body)),
    onSuccess: (_, args) => {
      queryClient.setQueryData<ResponseDtoPageDataModelTokenData>(
        queryKey,
        (old) =>
          old
            ? {
                ...old,
                items: old.items.map((item) =>
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
  return useMutation({
    mutationFn: async (args: EdenArgs<typeof tokenRoute, "get">) =>
      handleElysia(await rpc.api.token(args).key.post()),
  });
}

export function useDeleteTokenMutation() {
  const queryClient = useQueryClient();
  const queryKey = useTokenTableQueryKey();
  return useMutation({
    mutationFn: async (args: EdenArgs<typeof tokenRoute, "delete">) =>
      handleElysia(await rpc.api.token(args).delete()),
    onSuccess: (_, args) => {
      queryClient.setQueryData<ResponseDtoPageDataModelTokenData>(
        queryKey,
        (old) =>
          old
            ? {
                ...old,
                total: old.total - 1,
                items: old.items.filter((item) => item?.id !== Number(args.id)),
              }
            : old,
      );
    },
  });
}
