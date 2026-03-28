"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { DataTableId } from "@/lib/types/enums";
import { handleElysia } from "@/lib/utils/base";
import type { CreateTokenRequest, UpdateTokenRequest } from "@/openapi";
import { createTableAtoms } from "@/store/data-table-store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAtomValue } from "jotai";

const tokenTableAtoms = createTableAtoms(DataTableId.TOKENS);

function useTokenTableParams() {
  const store = useAtomValue(tokenTableAtoms.baseAtom);
  return {
    p: store.pagination.pageIndex + 1,
    keyword: store.globalFilter || undefined,
  };
}

export function useTokensQuery(params: { p?: number; keyword?: string }) {
  console.log("[useTokensQuery] queryKey:", queryKeys.tokens(params));
  return useQuery({
    queryKey: queryKeys.tokens(params),
    queryFn: async () =>
      handleElysia(
        await rpc.api.token.search.get({
          query: params,
        }),
      ),
    staleTime: Infinity,
    enabled: false,
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
  const params = useTokenTableParams();
  return useMutation({
    mutationFn: async (data: CreateTokenRequest) =>
      handleElysia(await rpc.api.token.post(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tokens(params) });
    },
  });
}

export function useUpdateTokenMutation() {
  const queryClient = useQueryClient();
  const params = useTokenTableParams();
  return useMutation({
    mutationFn: async (data: UpdateTokenRequest) =>
      handleElysia(await rpc.api.token.put(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tokens(params) });
    },
  });
}

export function useToggleTokenStatusMutation() {
  const queryClient = useQueryClient();
  const params = useTokenTableParams();
  return useMutation({
    mutationFn: async (data: UpdateTokenRequest) =>
      handleElysia(await rpc.api.token.status.put(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tokens(params) });
    },
  });
}

export function useFetchTokenKeyMutation() {
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await rpc.api.token({ id: id.toString() }).key.post();
      return handleElysia(res) as { key: string };
    },
  });
}

export function useDeleteTokenMutation() {
  const queryClient = useQueryClient();
  const params = useTokenTableParams();
  return useMutation({
    mutationFn: async (id: number) =>
      handleElysia(await rpc.api.token({ id: id.toString() }).delete()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tokens(params) });
    },
  });
}
