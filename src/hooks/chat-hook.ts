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
import type { rpc } from "@/lib/rpc";
import { getRpc } from "@/lib/rpc-lazy";
import type { EdenArgs, EdenResponse } from "@/lib/types/eden";
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

type ChatRoute = typeof rpc.api.chat;
type ChatRouteReturn = ReturnType<ChatRoute>;
type ConversationData = EdenResponse<ChatRouteReturn, "get">;
type ChatParams = EdenArgs<ChatRoute, "get">;

export function useConversationsInfiniteQuery(keyword?: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.conversations(keyword),
    queryFn: async ({ pageParam }) => {
      const { rpc, handleElysia } = await getRpc();
      return handleElysia(
        await rpc.api.chat.conversations.get({
          query: { p: pageParam, page_size: PAGE_SIZE, keyword },
        }),
      );
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.items.length < PAGE_SIZE ? undefined : allPages.length + 1,
    placeholderData: keepPreviousData,
  });
}

export function useConversationQuery(id?: string) {
  return useQuery({
    queryKey: queryKeys.chatMeta(id!),
    queryFn: async () => {
      const { rpc, handleElysia } = await getRpc();
      return handleElysia(await rpc.api.chat({ id: id! }).meta.get());
    },
    enabled: !!id,
    retry: false,
  });
}

export function useMessagesInfiniteQuery(id?: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.chatMessages(id!),
    queryFn: async ({ pageParam }) => {
      const { rpc, handleElysia } = await getRpc();
      return handleElysia(
        await rpc.api.chat({ id: id! }).get({
          query: { p: pageParam, page_size: PAGE_SIZE },
        }),
      );
    },
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
    mutationFn: async (args: EdenArgs<ChatRoute, "post">) => {
      const { rpc, handleElysia } = await getRpc();
      return handleElysia(await rpc.api.chat.post(args.body));
    },
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
    mutationFn: async (args: ChatParams & EdenArgs<ChatRouteReturn, "put">) => {
      const { rpc, handleElysia } = await getRpc();
      return handleElysia(await rpc.api.chat({ id: args.id }).put(args.body));
    },
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
    mutationFn: async (args: ChatParams) => {
      const { rpc, handleElysia } = await getRpc();
      return handleElysia(await rpc.api.chat(args).delete());
    },
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
    mutationFn: async (args: ChatParams) => {
      const { rpc, handleElysia } = await getRpc();
      return handleElysia(await rpc.api.chat(args).share.post({}));
    },
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
    mutationFn: async (args: ChatParams) => {
      const { rpc, handleElysia } = await getRpc();
      return handleElysia(await rpc.api.chat(args).share.delete());
    },
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
    ) => {
      const { rpc, handleElysia } = await getRpc();
      return handleElysia(
        await rpc.api.chat({ id: args.id }).messages.post(args.body),
      );
    },
    onSuccess: (data, args) => {
      const id = String(args.id);

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
    mutationFn: async (convIds: string[]) => {
      const { rpc, handleElysia } = await getRpc();
      return handleElysia(await rpc.api.chat.claim.post({ convIds }));
    },
    onError: (e) => handleError(e, t),
  });
}

export function useTaskStatusQuery(taskId: string, enabled = false) {
  return useQuery({
    queryKey: queryKeys.taskStatus(taskId),
    queryFn: async () => {
      const { rpc, handleElysia } = await getRpc();
      return handleElysia(await rpc.api.chat.task({ taskId }).get());
    },
    enabled: enabled && !!taskId,
    retry: false,
    staleTime: 0,
  });
}

export function useFinalizeTaskMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      convId: string;
      msgId: string;
      taskId: string;
      resultUrl: string;
    }) => {
      const { rpc, handleElysia } = await getRpc();
      return handleElysia(
        await rpc.api.chat({ id: args.convId }).task.finalize.post({
          msgId: args.msgId,
          taskId: args.taskId,
          resultUrl: args.resultUrl,
        }),
      );
    },
    onError: (e) => handleError(e, t),
    onSuccess: (data, args) => {
      type MessagesPage = {
        messages: Array<Record<string, unknown>>;
        total: number;
      };
      queryClient.setQueryData<InfiniteData<MessagesPage>>(
        queryKeys.chatMessages(args.convId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: page.messages.map((msg) =>
                msg.id === args.msgId
                  ? { ...msg, parts: data.parts }
                  : msg,
              ),
            })),
          };
        },
      );
    },
  });
}
