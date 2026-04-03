"use client";

import { PAGE_SIZE } from "@/lib/config/constants";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenArgs, EdenResponse } from "@/lib/types/eden";
import { handleElysia } from "@/lib/utils/base";
import { handleError } from "@/lib/utils/client";
import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useAuthQuery } from "./auth-hook";

const chatRoute = rpc.api.chat;

type ChatRouteReturn = ReturnType<typeof chatRoute>;
type ConversationsData = EdenResponse<{ get: typeof chatRoute.get }, "get">;
type ConversationData = EdenResponse<ChatRouteReturn, "get">;
type ChatParams = EdenArgs<typeof chatRoute, "get">;

export function useConversationsInfiniteQuery(keyword?: string) {
  const authQuery = useAuthQuery();
  return useInfiniteQuery({
    queryKey: queryKeys.conversations(keyword),
    queryFn: async ({ pageParam }) =>
      handleElysia(
        await chatRoute.get({
          query: { p: pageParam, page_size: PAGE_SIZE, keyword },
        }),
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.items.length < PAGE_SIZE ? undefined : allPages.length + 1,
    enabled: !!authQuery.data,
  });
}

export function useConversationQuery(id?: string) {
  const authQuery = useAuthQuery();
  return useQuery({
    queryKey: queryKeys.conversation(id!),
    queryFn: async () => handleElysia(await chatRoute({ id: id! }).meta.get()),
    enabled: !!authQuery.data && !!id,
    retry: false,
  });
}

export function useMessagesInfiniteQuery(id?: string) {
  const authQuery = useAuthQuery();
  return useInfiniteQuery({
    queryKey: queryKeys.conversationMessages(id!),
    queryFn: async ({ pageParam }) =>
      handleElysia(
        await chatRoute({ id: id! }).get({
          query: { p: pageParam, page_size: PAGE_SIZE },
        }),
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.messages.length < PAGE_SIZE ? undefined : allPages.length + 1,
    enabled: !!authQuery.data && !!id,
    retry: false,
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
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: EdenArgs<typeof chatRoute, "post">) =>
      handleElysia(await chatRoute.post(args.body)),
    onError: (e) => handleError(e, t),
    onSuccess: (data) => {
      const now = new Date();
      queryClient.setQueryData<InfiniteData<ConversationsData>>(
        queryKeys.conversations(),
        (old) => {
          if (!old) return old;
          const newItem = {
            ...data,
            shareId: null,
            totalCost: 0,
            createdAt: now,
            updatedAt: now,
          };
          const firstPage = old.pages[0];
          return {
            ...old,
            pages: [
              {
                ...firstPage,
                total: firstPage.total + 1,
                items: [newItem, ...firstPage.items],
              },
              ...old.pages.slice(1),
            ],
          };
        },
      );
    },
  });
}

export function useUpdateConversationMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: ChatParams & EdenArgs<ChatRouteReturn, "put">) =>
      handleElysia(await chatRoute({ id: args.id }).put(args.body)),
    onError: (e) => handleError(e, t),
    onSuccess: (data, args) => {
      const id = String(args.id);
      const patch: Record<string, unknown> = {};
      if (data.title !== undefined) patch.title = data.title;
      if (data.model !== undefined) patch.model = data.model;

      queryClient.setQueryData<InfiniteData<ConversationsData>>(
        queryKeys.conversations(),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((item) =>
                item.id === id ? { ...item, ...patch } : item,
              ),
            })),
          };
        },
      );
      queryClient.setQueryData<ConversationData>(
        queryKeys.conversation(id),
        (old) => (old ? { ...old, ...patch } : old),
      );
    },
  });
}

export function useDeleteConversationMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: ChatParams) =>
      handleElysia(await chatRoute(args).delete()),
    onError: (e) => handleError(e, t),
    onSuccess: (_, args) => {
      const id = String(args.id);
      queryClient.setQueryData<InfiniteData<ConversationsData>>(
        queryKeys.conversations(),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              total: page.total - 1,
              items: page.items.filter((item) => item.id !== id),
            })),
          };
        },
      );
    },
  });
}

export function useShareConversationMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: ChatParams) =>
      handleElysia(await chatRoute(args).share.post({})),
    onError: (e) => handleError(e, t),
    onSuccess: (data, args) => {
      queryClient.setQueryData<ConversationData>(
        queryKeys.conversation(String(args.id)),
        (old) => (old ? { ...old, shareId: data.shareId } : old),
      );
    },
  });
}

export function useRevokeShareMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: ChatParams) =>
      handleElysia(await chatRoute(args).share.delete()),
    onError: (e) => handleError(e, t),
    onSuccess: (_, args) => {
      queryClient.setQueryData<ConversationData>(
        queryKeys.conversation(String(args.id)),
        (old) => (old ? { ...old, shareId: null } : old),
      );
    },
  });
}

export function usePersistMessagesMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    onError: (e) => handleError(e, t),
    mutationFn: async (
      args: ChatParams & EdenArgs<ChatRouteReturn["messages"], "post">,
    ) =>
      handleElysia(await chatRoute({ id: args.id }).messages.post(args.body)),
    onSuccess: (data, args) => {
      if (!data.title) return;
      const id = String(args.id);
      queryClient.setQueryData<InfiniteData<ConversationsData>>(
        queryKeys.conversations(),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((item) =>
                item.id === id ? { ...item, title: data.title ?? null } : item,
              ),
            })),
          };
        },
      );
    },
  });
}
