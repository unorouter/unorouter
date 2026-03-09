"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import type { Token } from "@/openapi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type TokenMutationData = Pick<
  Token,
  | "name"
  | "remain_quota"
  | "expired_time"
  | "unlimited_quota"
  | "model_limits_enabled"
  | "model_limits"
  | "allow_ips"
  | "group"
  | "cross_group_retry"
>;

export function useTokensQuery(params: { p?: number; keyword?: string } = {}) {
  return useQuery({
    queryKey: queryKeys.tokens(params),
    queryFn: async () => {
      if (params.keyword) {
        return handleElysia(
          await rpc.api.token.search.get({
            query: {
              p: params.p?.toString(),
              keyword: params.keyword,
            },
          }),
        );
      }
      return handleElysia(
        await rpc.api.token.get({
          query: { p: params.p?.toString() },
        }),
      );
    },
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
  return useMutation({
    mutationFn: async (data: TokenMutationData) =>
      handleElysia(await rpc.api.token.post(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tokens"] });
    },
  });
}

export function useUpdateTokenMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Pick<Token, "id"> & TokenMutationData) =>
      handleElysia(await rpc.api.token.put(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tokens"] });
    },
  });
}

export function useToggleTokenStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Pick<Token, "id" | "status">) =>
      handleElysia(await rpc.api.token.status.put(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tokens"] });
    },
  });
}

export function useDeleteTokenMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) =>
      handleElysia(await rpc.api.token({ id: id.toString() }).delete()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tokens"] });
    },
  });
}
