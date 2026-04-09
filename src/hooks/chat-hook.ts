"use client";

import { PAGE_SIZE } from "@/lib/config/constants";
import {
  moveConvToTop,
  patchConv,
  prependConv,
  removeConv,
  type ConvItem,
  type ConvsInfinite,
} from "@/lib/react-query/conv-cache";
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

const chatRoute = rpc.api.chat;

type ChatRouteReturn = ReturnType<typeof chatRoute>;
type ConversationData = EdenResponse<ChatRouteReturn, "get">;
type ChatParams = EdenArgs<typeof chatRoute, "get">;

export function useConversationsInfiniteQuery(keyword?: string) {
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
  });
}

export function useConversationQuery(id?: string) {
  return useQuery({
    queryKey: queryKeys.chatMeta(id!),
    queryFn: async () => handleElysia(await chatRoute({ id: id! }).meta.get()),
    enabled: !!id,
    retry: false,
  });
}

export function useMessagesInfiniteQuery(id?: string) {
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
    enabled: !!id,
    placeholderData: keepPreviousData,
    retry: false,
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
      const newItem: ConvItem = {
        ...data,
        shareId: null,
        totalCost: 0,
        createdAt: now,
        updatedAt: now,
      };
      queryClient.setQueryData<ConvsInfinite>(
        queryKeys.conversations(),
        (old) => prependConv(old, newItem),
      );
    },
  });
}

export function useUpdateConversationMutation() {
  const queryClient = useQueryClient();
  const t = useTranslations();

  return useMutation({
    mutationFn: async (args: ChatParams & EdenArgs<ChatRouteReturn, "put">) =>
      handleElysia(await chatRoute({ id: args.id }).put(args.body)),
    onMutate: async (args) => {
      const id = String(args.id);
      const convsKey = queryKeys.conversations();
      const metaKey = queryKeys.chatMeta(id);

      await queryClient.cancelQueries({ queryKey: convsKey });
      await queryClient.cancelQueries({ queryKey: metaKey });

      const prevConvs = queryClient.getQueryData<ConvsInfinite>(convsKey);
      const prevMeta = queryClient.getQueryData<ConversationData>(metaKey);

      const patch: Partial<ConvItem> = {};
      if (args.body.title !== undefined) patch.title = args.body.title;
      if (args.body.model !== undefined) patch.model = args.body.model;

      queryClient.setQueryData<ConvsInfinite>(convsKey, (old) =>
        patchConv(old, id, patch),
      );
      queryClient.setQueryData<ConversationData>(metaKey, (old) =>
        old ? { ...old, ...patch } : old,
      );

      return { prevConvs, prevMeta, id };
    },
    onError: (e, _args, context) => {
      handleError(e, t);
      if (context) {
        queryClient.setQueryData(queryKeys.conversations(), context.prevConvs);
        queryClient.setQueryData(
          queryKeys.chatMeta(context.id),
          context.prevMeta,
        );
      }
    },
  });
}

export function useDeleteConversationMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: ChatParams) =>
      handleElysia(await chatRoute(args).delete()),
    onMutate: async (args) => {
      const convsKey = queryKeys.conversations();
      await queryClient.cancelQueries({ queryKey: convsKey });
      const prevConvs = queryClient.getQueryData<ConvsInfinite>(convsKey);
      queryClient.setQueryData<ConvsInfinite>(convsKey, (old) =>
        removeConv(old, String(args.id)),
      );
      return { prevConvs };
    },
    onError: (e, _args, context) => {
      handleError(e, t);
      if (context) {
        queryClient.setQueryData(queryKeys.conversations(), context.prevConvs);
      }
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
      type MessagesPage = {
        messages: Array<Record<string, unknown>>;
        total: number;
      };
      queryClient.setQueryData<InfiniteData<MessagesPage>>(
        queryKeys.chatMessages(id),
        (old) => {
          if (!old?.pages[0]) return old;
          const usage = data.usage;
          const newMessages = args.body.messages.map((m) => {
            const hasUsage = m.role === "assistant" && usage;
            return {
              id: crypto.randomUUID(),
              role: m.role,
              parts: m.parts,
              model: m.model ?? null,
              inputTokens: hasUsage ? usage.inputTokens : null,
              outputTokens: hasUsage ? usage.outputTokens : null,
              cost: hasUsage ? usage.cost : null,
            };
          });
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
      queryClient.setQueryData<ConvsInfinite>(
        queryKeys.conversations(),
        (old) =>
          moveConvToTop(old, id, (item) => ({
            updatedAt: new Date(),
            ...(data.title && { title: data.title }),
            ...(data.usage?.cost && {
              totalCost: (item.totalCost ?? 0) + data.usage.cost,
            }),
          })),
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

export function useClaimConversationsMutation() {
  const t = useTranslations();
  return useMutation({
    mutationFn: async (convIds: string[]) =>
      handleElysia(await chatRoute.claim.post({ convIds })),
    onError: (e) => handleError(e, t),
  });
}
