"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenArgs, EdenResponse } from "@/lib/types/eden";
import { handleElysia } from "@/lib/utils/base";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthQuery } from "./auth-hook";

const chatRoute = rpc.api.chat;
type ChatRouteReturn = ReturnType<typeof chatRoute>;

// Static chatRoute.get() = list, parameterized chatRoute({ id }).get() = single
type ConversationsData = EdenResponse<{ get: typeof chatRoute.get }, "get">;
type ConversationData = EdenResponse<ChatRouteReturn, "get">;
type ChatParams = EdenArgs<typeof chatRoute, "get">;

export function useConversationsQuery() {
  const authQuery = useAuthQuery();
  return useQuery({
    queryKey: queryKeys.conversations(),
    queryFn: async () => handleElysia(await chatRoute.get()),
    enabled: !!authQuery.data,
  });
}

export function useConversationQuery(id: string) {
  const authQuery = useAuthQuery();
  return useQuery({
    queryKey: queryKeys.conversation(id),
    queryFn: async () => handleElysia(await chatRoute({ id }).get()),
    enabled: !!authQuery.data && !!id,
  });
}

export function useSharedConversationQuery(shareId: string) {
  return useQuery({
    queryKey: queryKeys.sharedConversation(shareId),
    queryFn: async () =>
      handleElysia(await chatRoute.shared({ shareId }).get()),
    enabled: !!shareId,
  });
}

export function useCreateConversationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: EdenArgs<typeof chatRoute, "post">) =>
      handleElysia(await chatRoute.post(args.body)),
    onSuccess: (data) => {
      const now = new Date();
      queryClient.setQueryData<ConversationsData>(
        queryKeys.conversations(),
        (old) =>
          old
            ? {
                ...old,
                total: old.items.length + 1,
                items: [
                  { ...data, shareId: null, createdAt: now, updatedAt: now },
                  ...old.items,
                ],
              }
            : old,
      );
    },
  });
}

export function useUpdateConversationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: ChatParams & EdenArgs<ChatRouteReturn, "put">) =>
      handleElysia(await chatRoute({ id: args.id }).put(args.body)),
    onSuccess: (data, args) => {
      const id = String(args.id);
      queryClient.setQueryData<ConversationsData>(
        queryKeys.conversations(),
        (old) =>
          old
            ? {
                ...old,
                items: old.items.map((item) =>
                  item.id === id ? { ...item, title: data.title } : item,
                ),
              }
            : old,
      );
      queryClient.setQueryData<ConversationData>(
        queryKeys.conversation(id),
        (old) => (old ? { ...old, title: data.title } : old),
      );
    },
  });
}

export function useDeleteConversationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: ChatParams) =>
      handleElysia(await chatRoute(args).delete()),
    onSuccess: (_, args) => {
      const id = String(args.id);
      queryClient.setQueryData<ConversationsData>(
        queryKeys.conversations(),
        (old) =>
          old
            ? {
                ...old,
                total: old.total - 1,
                items: old.items.filter((item) => item.id !== id),
              }
            : old,
      );
    },
  });
}

export function useShareConversationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: ChatParams) =>
      handleElysia(await chatRoute(args).share.post({})),
    onSuccess: (data, args) => {
      queryClient.setQueryData<ConversationData>(
        queryKeys.conversation(String(args.id)),
        (old) => (old ? { ...old, shareId: data.shareId } : old),
      );
    },
  });
}

export function useRevokeShareMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: ChatParams) =>
      handleElysia(await chatRoute(args).share.delete()),
    onSuccess: (_, args) => {
      queryClient.setQueryData<ConversationData>(
        queryKeys.conversation(String(args.id)),
        (old) => (old ? { ...old, shareId: null } : old),
      );
    },
  });
}

export function usePersistMessagesMutation() {
  return useMutation({
    mutationFn: async (
      args: ChatParams & EdenArgs<ChatRouteReturn["messages"], "post">,
    ) =>
      handleElysia(
        await chatRoute({ id: args.id }).messages.post(args.body),
      ),
  });
}
