"use client";

import { useAuthQuery } from "@/hooks/auth-hook";
import { PAGE_SIZE } from "@/lib/config/constants";
import { mutateMessages, patchMessages } from "@/lib/react-query/cache-helpers";
import {
  patchConv,
  prependConv,
  removeConv,
  type ConvItem,
  type ConvsInfinite,
} from "@/lib/react-query/conv-cache";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { getChatHelpers } from "@/store/chat-store";
import { handleElysia, uid } from "@/lib/utils/base";
import dayjs from "dayjs";
import type { EdenArgs, EdenResponse } from "@/lib/types/eden";
import { handleError } from "@/lib/utils/client";
import {
  readLocalConversation,
  readLocalConversationBundle,
  readLocalConversations,
  readLocalMessageItems,
  readLocalMessages,
} from "@/lib/db/client/reads";
import {
  deleteLocalConversation,
  deleteLocalMessage,
  deleteLocalMessagesForConv,
  replaceLocalConversationBindings,
  replaceLocalMessageItems,
  upsertLocalConversation,
  upsertLocalConversationSettings,
  upsertLocalMessage,
  upsertLocalMessageItem,
} from "@/lib/db/client/writes";
import { enqueuePending } from "@/lib/db/client/pending-sync";
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

async function mirrorConversationIfSynced(
  userId: number,
  convId: string,
): Promise<void> {
  const conv = await readLocalConversation(userId, convId);
  if (conv?.syncExpiresAt == null) return;
  const bundle = await readLocalConversationBundle(userId, convId);
  if (!bundle) return;
  try {
    handleElysia(
      await rpc.api
        .sync({ kind: "conversations" })({ id: convId })
        .post({ payload: bundle, keepExpiry: true }),
    );
  } catch (err) {
    await enqueuePending(userId, "conversations", convId, "patch", err);
  }
}

export function useConversationsInfiniteQuery(keyword?: string) {
  const auth = useAuthQuery();
  const isLoggedIn = !!auth.data;
  return useInfiniteQuery({
    queryKey: queryKeys.conversations(keyword),
    queryFn: async ({ pageParam }) => {
      const userId = auth.data?.id;
      if (userId != null) {
        const local = (await readLocalConversations(userId)) ?? [];
        const filtered = keyword
          ? local.filter((c) =>
              (c.title ?? "").toLowerCase().includes(keyword.toLowerCase()),
            )
          : local;
        const start = (pageParam - 1) * PAGE_SIZE;
        const slice = filtered.slice(start, start + PAGE_SIZE);
        return {
          items: slice as unknown as ConvItem[],
          total: filtered.length,
          page: pageParam,
          pageSize: PAGE_SIZE,
        };
      }
      return {
        items: [] as ConvItem[],
        total: 0,
        page: pageParam,
        pageSize: PAGE_SIZE,
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.items.length < PAGE_SIZE ? undefined : allPages.length + 1,
    placeholderData: keepPreviousData,
    enabled: isLoggedIn,
  });
}

export function useConversationQuery(id?: string) {
  const auth = useAuthQuery();
  return useQuery({
    queryKey: queryKeys.chatMeta(id!),
    queryFn: async () => {
      const userId = auth.data?.id;
      if (userId != null && id) {
        const local = await readLocalConversation(userId, id);
        if (local) return local as unknown as ConversationData;
      }
      throw new Error("chat-not-found");
    },
    enabled: !!id && !!auth.data,
    retry: false,
  });
}

export function useMessagesInfiniteQuery(id?: string) {
  const auth = useAuthQuery();
  return useInfiniteQuery({
    queryKey: queryKeys.chatMessages(id!),
    queryFn: async ({ pageParam }) => {
      const userId = auth.data?.id;
      if (userId == null || !id)
        return { messages: [], total: 0, page: pageParam, pageSize: PAGE_SIZE };
      const msgs = (await readLocalMessages(userId, id)) ?? [];
      const items = (await readLocalMessageItems(userId, id)) ?? [];
      const itemsByMsg = new Map<string, typeof items>();
      for (const it of items) {
        const arr = itemsByMsg.get(it.messageId) ?? [];
        arr.push(it);
        itemsByMsg.set(it.messageId, arr);
      }
      const messages = msgs.map((m) => ({
        ...m,
        items: itemsByMsg.get(m.id) ?? [],
      }));
      return {
        messages,
        total: messages.length,
        page: pageParam,
        pageSize: PAGE_SIZE,
      };
    },
    initialPageParam: 1,
    getNextPageParam: () => undefined,
    enabled: !!id && !!auth.data,
    placeholderData: keepPreviousData,
    retry: false,
  });
}

export function useUpdateConversationMutation() {
  const queryClient = useQueryClient();
  const auth = useAuthQuery();
  const t = useTranslations();

  return useMutation({
    mutationFn: async (args: ChatParams & EdenArgs<ChatRouteReturn, "put">) => {
      const id = String(args.id);
      const userId = auth.data?.id;
      if (userId != null) {
        const existing = await readLocalConversation(userId, id);
        const now = dayjs().toDate();
        await upsertLocalConversation(userId, {
          ...(existing ?? {}),
          id,
          ...args.body,
          updatedAt: now,
        });
        await mirrorConversationIfSynced(userId, id);
      }
      return { id, ...args.body };
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
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (args: ChatParams) => {
      const id = String(args.id);
      const userId = auth.data?.id;
      if (userId != null) {
        const existing = await readLocalConversation(userId, id);
        const wasSynced =
          (existing as { syncExpiresAt?: Date | null } | null)?.syncExpiresAt !=
          null;
        await deleteLocalConversation(userId, id);
        if (wasSynced) {
          try {
            handleElysia(
              await rpc.api.sync({ kind: "conversations" })({ id }).delete(),
            );
          } catch (err) {
            await enqueuePending(userId, "conversations", id, "delete", err);
          }
        }
      }
      return { id };
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.syncState() });
    },
    onError: (e, _args, context) => {
      handleError(e, t);
      if (context) {
        queryClient.setQueryData(queryKeys.conversations(), context.prevConvs);
      }
    },
  });
}

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
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      convId: string;
      msgId: string;
      taskId: string;
      resultUrl: string;
    }) =>
      handleElysia(
        await rpc.api.chat({ id: args.convId }).task.finalize.post({
          msgId: args.msgId,
          taskId: args.taskId,
          resultUrl: args.resultUrl,
        }),
      ),
    onError: (e) => handleError(e, t),
    onSuccess: (data, args) => {
      patchMessages(qc, args.convId, (msg) =>
        msg.id === args.msgId ? { ...msg, items: data.items } : msg,
      );
    },
  });
}

export function useEditMessageMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    onError: (e) => handleError(e, t),
    mutationFn: async (args: {
      convId: string;
      msgId: string;
      body: EdenArgs<
        ReturnType<ReturnType<ChatRoute>["messages"]>,
        "put"
      >["body"];
    }) => {
      const userId = auth.data?.id;
      const newItems = args.body.items.map((it, seq) => ({
        id: it.id ?? uid(),
        sequenceIndex: seq,
        outputIndex: it.output_index ?? null,
        type: it.type,
        data: it.data,
      }));
      if (userId != null) {
        await replaceLocalMessageItems(userId, args.msgId, newItems);
        const now = dayjs().toDate();
        const msgs = (await readLocalMessages(userId, args.convId)) ?? [];
        const existing = msgs.find((m) => m.id === args.msgId);
        if (existing) {
          await upsertLocalMessage(userId, {
            ...existing,
            isEdited: true,
            updatedAt: now,
          });
        }
        await mirrorConversationIfSynced(userId, args.convId);
      }
      return { items: newItems };
    },
    onSuccess: (data, args) => {
      patchMessages(qc, args.convId, (msg) =>
        msg.id === args.msgId
          ? {
              ...msg,
              isEdited: true,
              items: data.items.map((it) => ({
                ...it,
                outputIndex: it.outputIndex,
                sequenceIndex: it.sequenceIndex,
              })),
            }
          : msg,
      );
    },
  });
}

export function useClearConversationMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    onError: (e) => handleError(e, t),
    mutationFn: async (args: ChatParams) => {
      const id = String(args.id);
      const userId = auth.data?.id;
      if (userId != null) {
        await deleteLocalMessagesForConv(userId, id);
        await mirrorConversationIfSynced(userId, id);
      }
      return { id };
    },
    onSuccess: (_data, args) => {
      type MessagesPage = {
        messages: Array<Record<string, unknown>>;
        total: number;
      };
      queryClient.setQueryData<InfiniteData<MessagesPage>>(
        queryKeys.chatMessages(String(args.id)),
        (old) =>
          old && {
            ...old,
            pages: [{ messages: [], total: 0 }],
            pageParams: [1],
          },
      );
      getChatHelpers()?.setMessages(() => []);
    },
  });
}

export function useDuplicateConversationMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    onError: (e) => handleError(e, t),
    mutationFn: async (args: ChatParams) => {
      const userId = auth.data?.id;
      if (userId == null) throw new Error("not-logged-in");
      const srcId = String(args.id);
      const bundle = await readLocalConversationBundle(userId, srcId);
      if (!bundle) throw new Error("not-found");
      const now = dayjs().toDate();
      const newId = uid();
      const idMap = new Map<string, string>();
      const newConv = {
        ...bundle.conversation,
        id: newId,
        syncExpiresAt: null,
        createdAt: now,
        updatedAt: now,
      };
      await upsertLocalConversation(userId, newConv);
      if (bundle.settings) {
        await upsertLocalConversationSettings(userId, {
          ...bundle.settings,
          convId: newId,
        });
      }
      await replaceLocalConversationBindings(userId, newId, {
        conversationCharacters: bundle.conversationCharacters.map((c) => ({
          characterId: c.characterId,
          orderIndex: c.orderIndex,
          isActive: c.isActive,
          overrides: c.overrides,
        })),
        conversationLorebooks: bundle.conversationLorebooks.map((l) => ({
          lorebookId: l.lorebookId,
          orderIndex: l.orderIndex,
        })),
      });
      for (const m of bundle.messages) {
        idMap.set(m.id, uid());
      }
      for (const m of bundle.messages) {
        await upsertLocalMessage(userId, {
          ...m,
          id: idMap.get(m.id)!,
          convId: newId,
          parentId: m.parentId ? (idMap.get(m.parentId) ?? null) : null,
        });
      }
      for (const it of bundle.messageItems) {
        const newMsgId = idMap.get(it.messageId);
        if (!newMsgId) continue;
        await upsertLocalMessageItem(userId, {
          ...it,
          id: uid(),
          messageId: newMsgId,
        });
      }
      return newConv;
    },
    onSuccess: (data) => {
      const now = dayjs().toDate();
      const newItem: ConvItem = {
        id: (data as { id: string }).id,
        title: (data as { title: string | null }).title ?? null,
        model: null,
        totalCost: 0,
        createdAt: now,
        updatedAt: now,
      } as ConvItem;
      queryClient.setQueryData<ConvsInfinite>(
        queryKeys.conversations(),
        (old) => prependConv(old, newItem),
      );
    },
  });
}

export function useConversationMarkdown() {
  const t = useTranslations();
  return useMutation({
    onError: (e) => handleError(e, t),
    mutationFn: async (args: ChatParams) => {
      return handleElysia(await rpc.api.chat({ id: args.id }).markdown.get());
    },
  });
}

export function useSetActiveBranchMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    onError: (e) => handleError(e, t),
    mutationFn: async (args: { convId: string; msgId: string }) => {
      const userId = auth.data?.id;
      if (userId != null) {
        const msgs = (await readLocalMessages(userId, args.convId)) ?? [];
        const target = msgs.find((m) => m.id === args.msgId);
        const parentId = target?.parentId ?? null;
        const now = dayjs().toDate();
        for (const m of msgs) {
          if ((m.parentId ?? null) === parentId) {
            await upsertLocalMessage(userId, {
              ...m,
              isActiveBranch: m.id === args.msgId,
              updatedAt: now,
            });
          }
        }
        await mirrorConversationIfSynced(userId, args.convId);
      }
      return { id: args.msgId };
    },
    onSuccess: (_data, args) => {
      mutateMessages(qc, args.convId, (messages) => {
        const target = messages.find((m) => m.id === args.msgId);
        if (!target) return messages;
        const targetParent = target.parentId ?? null;
        return messages.map((m) =>
          (m.parentId ?? null) === targetParent
            ? { ...m, isActiveBranch: m.id === args.msgId }
            : m,
        );
      });
    },
  });
}

export function useDeleteMessageMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    onError: (e) => handleError(e, t),
    mutationFn: async (args: { convId: string; msgId: string }) => {
      const userId = auth.data?.id;
      if (userId != null) {
        // Splice-delete: rewire children parentId locally, then drop the row.
        const msgs = (await readLocalMessages(userId, args.convId)) ?? [];
        const target = msgs.find((m) => m.id === args.msgId);
        const newParentId = target?.parentId ?? null;
        const now = dayjs().toDate();
        for (const m of msgs) {
          if (m.parentId === args.msgId) {
            await upsertLocalMessage(userId, {
              ...m,
              parentId: newParentId,
              updatedAt: now,
            });
          }
        }
        await deleteLocalMessage(userId, args.msgId);
        await mirrorConversationIfSynced(userId, args.convId);
      }
      return { id: args.msgId };
    },
    onSuccess: (_data, args) => {
      mutateMessages(qc, args.convId, (messages) => {
        const target = messages.find((m) => m.id === args.msgId);
        const newParentId = target?.parentId ?? null;
        return messages
          .filter((m) => m.id !== args.msgId)
          .map((m) =>
            m.parentId === args.msgId ? { ...m, parentId: newParentId } : m,
          );
      });
    },
  });
}
