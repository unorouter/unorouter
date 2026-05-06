"use client";

import { PAGE_SIZE } from "@/lib/config/constants";
import {
  patchConv,
  prependConv,
  removeConv,
  type ConvItem,
  type ConvsInfinite,
} from "@/lib/react-query/conv-cache";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import dayjs from "dayjs";
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
      return handleElysia(await rpc.api.chat.post(args.body));
    },
    onError: (e) => handleError(e, t),
    onSuccess: (data) => {
      const now = dayjs().toDate();
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

// `usePersistMessagesMutation` was removed: the chat-history-adapter inlines
// the POST and replicates the same cache patches. Keeping this hook would
// drift out of sync with the adapter without surfacing.

export function useClaimConversationsMutation() {
  const t = useTranslations();
  return useMutation({
    mutationFn: async (convIds: string[]) => {
      return handleElysia(await rpc.api.chat.claim.post({ convIds }));
    },
    onError: (e) => handleError(e, t),
  });
}

export function useTaskStatusQuery(taskId: string, enabled = false) {
  return useQuery({
    queryKey: queryKeys.taskStatus(taskId),
    queryFn: async () => {
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
                msg.id === args.msgId ? { ...msg, items: data.items } : msg,
              ),
            })),
          };
        },
      );
    },
  });
}

/**
 * Edit a message's items in place. Used for assistant-message in-place edits
 * that don't trigger a regeneration. Caches are patched via setQueryData so
 * paginated lists reflect the new items immediately.
 */
export function useEditMessageMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    onError: (e) => handleError(e, t),
    mutationFn: async (args: {
      convId: string;
      msgId: string;
      body: EdenArgs<
        ReturnType<ReturnType<ChatRoute>["messages"]>,
        "put"
      >["body"];
    }) =>
      handleElysia(
        await rpc.api
          .chat({ id: args.convId })
          .messages({ msgId: args.msgId })
          .put(args.body),
      ),
    onSuccess: (_data, args) => {
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
                  ? {
                      ...msg,
                      isEdited: true,
                      items: args.body.items.map((it, seq) => ({
                        id: it.id ?? `tmp-${seq}`,
                        sequenceIndex: seq,
                        outputIndex: it.output_index ?? null,
                        type: it.type,
                        data: it.data,
                      })),
                    }
                  : msg,
              ),
            })),
          };
        },
      );
    },
  });
}

/**
 * Drop all messages from a conversation, keeping settings/bindings/title.
 * Replaces the messages cache with an empty first page so the UI clears
 * immediately without a refetch.
 */
export function useClearConversationMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    onError: (e) => handleError(e, t),
    mutationFn: async (args: ChatParams) =>
      handleElysia(await rpc.api.chat({ id: args.id }).clear.post()),
    onSuccess: (_data, args) => {
      const id = String(args.id);
      type MessagesPage = {
        messages: Array<Record<string, unknown>>;
        total: number;
      };
      queryClient.setQueryData<InfiniteData<MessagesPage>>(
        queryKeys.chatMessages(id),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: [{ messages: [], total: 0 }],
            pageParams: [1],
          };
        },
      );
    },
  });
}

/**
 * Clone a conversation (messages, items, settings, bindings) under a new id.
 * Prepends the new conversation to the sidebar list optimistically by
 * patching the conversations cache.
 */
export function useDuplicateConversationMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    onError: (e) => handleError(e, t),
    mutationFn: async (args: ChatParams) =>
      handleElysia(await rpc.api.chat({ id: args.id }).duplicate.post()),
    onSuccess: (data) => {
      const now = dayjs().toDate();
      const newItem: ConvItem = {
        id: data.id,
        title: data.title ?? null,
        model: null,
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

/**
 * Render the conversation as markdown for clipboard copy. Returns the raw
 * string; the caller decides how to surface it (toast, download, etc.).
 */
export function useConversationMarkdown() {
  const t = useTranslations();
  return useMutation({
    onError: (e) => handleError(e, t),
    mutationFn: async (args: ChatParams) => {
      return handleElysia(await rpc.api.chat({ id: args.id }).markdown.get());
    },
  });
}

/**
 * Splice-delete a single message: server rewires children's parentId to the
 * deleted message's parent. Cache update mirrors that rewire so the active
 * branch path stays valid without a refetch.
 */
export function useSetActiveBranchMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    onError: (e) => handleError(e, t),
    mutationFn: async (args: { convId: string; msgId: string }) =>
      handleElysia(
        await rpc.api
          .chat({ id: args.convId })
          ["active-branch"].post({ messageId: args.msgId }),
      ),
    onSuccess: (_data, args) => {
      type Msg = {
        id: string;
        parentId?: string | null;
        isActiveBranch?: boolean;
      } & Record<string, unknown>;
      type MessagesPage = { messages: Msg[]; total: number };
      queryClient.setQueryData<InfiniteData<MessagesPage>>(
        queryKeys.chatMessages(args.convId),
        (old) => {
          if (!old) return old;
          let target: Msg | undefined;
          for (const page of old.pages) {
            target = page.messages.find((m) => m.id === args.msgId);
            if (target) break;
          }
          if (!target) return old;
          const targetParentId = target.parentId ?? null;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: page.messages.map((m) => {
                const sameParent = (m.parentId ?? null) === targetParentId;
                if (!sameParent) return m;
                return { ...m, isActiveBranch: m.id === args.msgId };
              }),
            })),
          };
        },
      );
    },
  });
}

export function useDeleteMessageMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    onError: (e) => handleError(e, t),
    mutationFn: async (args: { convId: string; msgId: string }) =>
      handleElysia(
        await rpc.api
          .chat({ id: args.convId })
          .messages({ msgId: args.msgId })
          .delete(),
      ),
    onSuccess: (_data, args) => {
      type Msg = { id: string; parentId?: string | null } & Record<string, unknown>;
      type MessagesPage = { messages: Msg[]; total: number };
      queryClient.setQueryData<InfiniteData<MessagesPage>>(
        queryKeys.chatMessages(args.convId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => {
              const target = page.messages.find((m) => m.id === args.msgId);
              const newParentId = target?.parentId ?? null;
              return {
                ...page,
                total: Math.max(0, page.total - 1),
                messages: page.messages
                  .filter((m) => m.id !== args.msgId)
                  .map((m) =>
                    m.parentId === args.msgId ? { ...m, parentId: newParentId } : m,
                  ),
              };
            }),
          };
        },
      );
    },
  });
}
