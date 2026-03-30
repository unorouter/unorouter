"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthQuery } from "./auth-hook";

const chatRoute = rpc.api.chat;

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
    mutationFn: async (body: { model: string; title?: string }) =>
      handleElysia(await chatRoute.post(body)),
    onSuccess: (data) => {
      queryClient.setQueryData(
        queryKeys.conversations(),
        (old: { items: unknown[] } | undefined) =>
          old
            ? { ...old, items: [data, ...old.items], total: old.items.length + 1 }
            : old,
      );
    },
  });
}

export function useUpdateConversationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; title: string }) =>
      handleElysia(await chatRoute({ id: args.id }).put({ title: args.title })),
    onSuccess: (data, args) => {
      const id = args.id;
      queryClient.setQueryData(
        queryKeys.conversations(),
        (old: { items: { id: string; title: string | null }[] } | undefined) =>
          old
            ? {
                ...old,
                items: old.items.map((item) =>
                  item.id === id ? { ...item, title: data.title } : item,
                ),
              }
            : old,
      );
      queryClient.setQueryData(
        queryKeys.conversation(id),
        (old: { title: string | null } | undefined) =>
          old ? { ...old, title: data.title } : old,
      );
    },
  });
}

export function useDeleteConversationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      handleElysia(await chatRoute({ id }).delete()),
    onSuccess: (_, id) => {
      queryClient.setQueryData(
        queryKeys.conversations(),
        (old: { items: { id: string }[]; total: number } | undefined) =>
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
    mutationFn: async (id: string) =>
      handleElysia(await chatRoute({ id }).share.post({})),
    onSuccess: (data, id) => {
      queryClient.setQueryData(
        queryKeys.conversation(id),
        (old: { shareId: string | null } | undefined) =>
          old ? { ...old, shareId: data.shareId } : old,
      );
    },
  });
}

export function useRevokeShareMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      handleElysia(await chatRoute({ id }).share.delete()),
    onSuccess: (_, id) => {
      queryClient.setQueryData(
        queryKeys.conversation(id),
        (old: { shareId: string | null } | undefined) =>
          old ? { ...old, shareId: null } : old,
      );
    },
  });
}

export function usePersistMessagesMutation() {
  return useMutation({
    mutationFn: async (args: {
      convId: string;
      messages: { id?: string; role: string; parts: unknown }[];
    }) =>
      handleElysia(
        await chatRoute({ id: args.convId }).messages.post({
          messages: args.messages,
        }),
      ),
  });
}
