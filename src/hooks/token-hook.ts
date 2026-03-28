"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { DataTableId } from "@/lib/types/enums";
import { handleElysia } from "@/lib/utils/base";
import type {
  CreateTokenRequest,
  ResponseDtoPageDataModelTokenData,
  UpdateTokenRequest,
} from "@/openapi";
import { createTableAtoms } from "@/store/data-table-store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { useAuthQuery } from "./auth-hook";

const tokenTableAtoms = createTableAtoms(DataTableId.TOKENS);

function useTokenTableQueryKey() {
  const store = useAtomValue(tokenTableAtoms.baseAtom);
  return queryKeys.tokens({
    p: store.pagination.pageIndex + 1,
    keyword: store.globalFilter || undefined,
  });
}

export function useTokensQuery(
  params: { p?: number; page_size?: number; keyword?: string } = {},
) {
  const authQuery = useAuthQuery();
  return useQuery({
    queryKey: queryKeys.tokens(params),
    queryFn: async () =>
      handleElysia(
        await rpc.api.token.search.get({
          query: params,
        }),
      ),
    enabled: !!authQuery.data,
  });
}

export function useTokenQuery(id: number) {
  return useQuery({
    queryKey: queryKeys.token(id),
    queryFn: async () =>
      handleElysia(await rpc.api.token({ id: id.toString() }).get()),
    enabled: id > 0,
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
    mutationFn: async (data: CreateTokenRequest) =>
      handleElysia(await rpc.api.token.post(data)),
    onSuccess: () => {
      queryClient.setQueryData<ResponseDtoPageDataModelTokenData>(
        queryKey,
        (old) => (old ? { ...old, total: old.total + 1 } : old),
      );
    },
  });
}

export function useUpdateTokenMutation() {
  const queryClient = useQueryClient();
  const queryKey = useTokenTableQueryKey();
  return useMutation({
    mutationFn: async (data: UpdateTokenRequest) =>
      handleElysia(await rpc.api.token.put(data)),
    onSuccess: (_, variables) => {
      queryClient.setQueryData<ResponseDtoPageDataModelTokenData>(
        queryKey,
        (old) =>
          old
            ? {
                ...old,
                items: old.items.map((item) =>
                  item?.id === variables.id ? { ...item, ...variables } : item,
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
    mutationFn: async (data: UpdateTokenRequest) =>
      handleElysia(await rpc.api.token.status.put(data)),
    onSuccess: (_, variables) => {
      queryClient.setQueryData<ResponseDtoPageDataModelTokenData>(
        queryKey,
        (old) =>
          old
            ? {
                ...old,
                items: old.items.map((item) =>
                  item?.id === variables.id
                    ? { ...item, status: variables.status }
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
    mutationFn: async (id: number) =>
      handleElysia(await rpc.api.token({ id: id.toString() }).key.post()),
  });
}

export function useDeleteTokenMutation() {
  const queryClient = useQueryClient();
  const queryKey = useTokenTableQueryKey();
  return useMutation({
    mutationFn: async (id: number) =>
      handleElysia(await rpc.api.token({ id: id.toString() }).delete()),
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<ResponseDtoPageDataModelTokenData>(
        queryKey,
        (old) =>
          old
            ? {
                ...old,
                total: old.total - 1,
                items: old.items.filter((item) => item?.id !== deletedId),
              }
            : old,
      );
    },
  });
}
