"use client";

import { PAGE_SIZE } from "@/lib/config/constants";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenArgs, EdenResponse } from "@/lib/types/eden";
import { handleElysia } from "@/lib/utils/base";
import { handleError } from "@/lib/utils/client";
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useAuthQuery } from "./auth-hook";

const chatRoute = rpc.api.chat;

type ChatRouteReturn = ReturnType<typeof chatRoute>;
type ConversationsData = EdenResponse<{ get: typeof chatRoute.conversations.get }, "get">;
type ConversationData = EdenResponse<ChatRouteReturn, "get">;
type ChatParams = EdenArgs<typeof chatRoute, "get">;

export function useConversationsInfiniteQuery(keyword?: string) {
  const authQuery = useAuthQuery();

  console.log("Using chat hook with keyword:", !!authQuery.data, keyword);
  return useInfiniteQuery({
    queryKey: queryKeys.conversations(keyword),
    queryFn: async ({ pageParam }) =>
      handleElysia(
        await chatRoute.conversations.get({
          query: { p: pageParam, page_size: PAGE_SIZE, keyword },
        }),
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.items.length < PAGE_SIZE ? undefined : allPages.length + 1,
    placeholderData: keepPreviousData,
    enabled: !!authQuery.data,
  });
}

export function useConversationQuery(id?: string) {
  const authQuery = useAuthQuery();
  return useQuery({
    queryKey: queryKeys.chatMeta(id!),
    queryFn: async () => handleElysia(await chatRoute({ id: id! }).meta.get()),
    enabled: !!authQuery.data && !!id,
    retry: false,
  });
}

export function useMessagesInfiniteQuery(id?: string) {
  const authQuery = useAuthQuery();
  return useInfiniteQuery({
    queryKey: queryKeys.chatMessages(id!),
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
    placeholderData: keepPreviousData,
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
        queryKeys.chatMeta(id),
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
        queryKeys.chatMeta(String(args.id)),
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
        queryKeys.chatMeta(String(args.id)),
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
      const id = String(args.id);

      // Append persisted messages (with usage data) to the messages query cache
      // so useMessageMeta picks them up immediately without a refetch
      type MessagesPage = { messages: Array<Record<string, unknown>>; total: number };
      queryClient.setQueryData<InfiniteData<MessagesPage>>(
        queryKeys.chatMessages(id),
        (old) => {
          if (!old?.pages[0]) return old;
          const newMessages = args.body.messages.map((m) => ({
            id: crypto.randomUUID(),
            role: m.role,
            parts: m.parts,
            model: m.model ?? null,
            inputTokens:
              m.role === "assistant" && data.usage
                ? data.usage.inputTokens
                : null,
            outputTokens:
              m.role === "assistant" && data.usage
                ? data.usage.outputTokens
                : null,
            cost:
              m.role === "assistant" && data.usage ? data.usage.cost : null,
          }));
          const firstPage = old.pages[0];
          return {
            ...old,
            pages: [
              {
                ...firstPage,
                messages: [...firstPage.messages, ...newMessages],
              },
              ...old.pages.slice(1),
            ],
          };
        },
      );

      // Patch sidebar: update timestamp, title, cost and move to top
      queryClient.setQueryData<InfiniteData<ConversationsData>>(
        queryKeys.conversations(),
        (old) => {
          if (!old) return old;
          let target: ConversationsData["items"][number] | undefined;
          const pagesWithout = old.pages.map((page) => ({
            ...page,
            items: page.items.filter((item) => {
              if (item.id !== id) return true;
              target = { ...item, updatedAt: new Date() };
              if (data.title) target.title = data.title;
              if (data.usage?.cost)
                target.totalCost = (target.totalCost ?? 0) + data.usage.cost;
              return false;
            }),
          }));
          if (!target) return old;
          const firstPage = pagesWithout[0];
          return {
            ...old,
            pages: [
              { ...firstPage, items: [target, ...firstPage.items] },
              ...pagesWithout.slice(1),
            ],
          };
        },
      );

      // Patch conversation meta cache for header totals
      if (data.usage) {
        queryClient.setQueryData<ConversationData>(
          queryKeys.chatMeta(id),
          (old) => {
            if (!old) return old;
            return {
              ...old,
              totalInputTokens:
                (old.totalInputTokens ?? 0) + data.usage!.inputTokens,
              totalOutputTokens:
                (old.totalOutputTokens ?? 0) + data.usage!.outputTokens,
              totalCost: (old.totalCost ?? 0) + data.usage!.cost,
            };
          },
        );
      }
    },
  });
}
