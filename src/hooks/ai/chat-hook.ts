"use client";

import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { joinItemsToMessages } from "@/lib/ai/chat/messages";
import { GUEST_USER_ID, PAGE_SIZE } from "@/lib/config/constants";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { chatHelpersAtom, chatStore } from "@/store/chat-store";
import { handleElysia, uid } from "@/lib/utils/base";
import { dayjs } from "@/lib/utils/format/date";
import { handleError } from "@/lib/utils/client";
import {
  deleteLocalConversation,
  deleteLocalMessage,
  deleteLocalMessagesForConv,
  readLocalConversation,
  readLocalConversationBundle,
  readLocalConversations,
  readLocalMessageItems,
  readLocalMessages,
  replaceLocalConversationBindings,
  replaceLocalMessageItems,
  upsertLocalConversation,
  upsertLocalConversationSettings,
  upsertLocalMessage,
  upsertLocalMessageItem,
} from "@/lib/db/client/data/chat";
import {
  mirrorConvDeltaIfSynced,
  mirrorConvIfSynced,
  unmirrorIfSynced,
} from "@/hooks/ai/rp/shared";
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useTranslations } from "next-intl";

type ConvIdArg = { id: string };
type UpdateConvBody = { title?: string | null; model?: string };
type EditMessageBody = {
  items: Array<{
    id?: string;
    type: string;
    output_index?: number | null;
    data: unknown;
  }>;
};

export function useConversationsInfiniteQuery(keyword?: string) {
  const auth = useAuthQuery();
  return useInfiniteQuery({
    queryKey: queryKeys.conversations(keyword),
    queryFn: async ({ pageParam }) => {
      const userId = auth.data?.id ?? GUEST_USER_ID;
      const local = (await readLocalConversations(userId)) ?? [];
      const filtered = keyword
        ? local.filter((c) =>
            (c.title ?? "").toLowerCase().includes(keyword.toLowerCase()),
          )
        : local;
      const start = (pageParam - 1) * PAGE_SIZE;
      const slice = filtered.slice(start, start + PAGE_SIZE);
      return {
        items: slice,
        total: filtered.length,
        page: pageParam,
        pageSize: PAGE_SIZE,
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.items.length < PAGE_SIZE ? undefined : allPages.length + 1,
    placeholderData: keepPreviousData,
  });
}

export function useConversationQuery(id?: string) {
  const auth = useAuthQuery();
  return useQuery({
    queryKey: queryKeys.chatMeta(id!),
    queryFn: async () => {
      const userId = auth.data?.id ?? GUEST_USER_ID;
      if (id) {
        const local = await readLocalConversation(userId, id);
        if (local) return local;
      }
      throw new Error("chat-not-found");
    },
    enabled: !!id,
    retry: false,
  });
}

export function useMessagesInfiniteQuery(id?: string) {
  const auth = useAuthQuery();
  return useInfiniteQuery({
    queryKey: queryKeys.chatMessages(id!),
    queryFn: async ({ pageParam }) => {
      const userId = auth.data?.id ?? GUEST_USER_ID;
      if (!id)
        return { messages: [], total: 0, page: pageParam, pageSize: PAGE_SIZE };
      const msgs = (await readLocalMessages(userId, id)) ?? [];
      const items = (await readLocalMessageItems(userId, id)) ?? [];
      const messages = joinItemsToMessages(msgs, items);
      return {
        messages,
        total: messages.length,
        page: pageParam,
        pageSize: PAGE_SIZE,
      };
    },
    initialPageParam: 1,
    getNextPageParam: () => undefined,
    enabled: !!id,
    placeholderData: keepPreviousData,
    retry: false,
  });
}

export function useUpdateConversationMutation() {
  const queryClient = useQueryClient();
  const auth = useAuthQuery();
  const t = useTranslations();

  return useMutation({
    mutationFn: async (args: ConvIdArg & { body: UpdateConvBody }) => {
      const id = args.id;
      const userId = auth.data?.id ?? GUEST_USER_ID;
      const existing = await readLocalConversation(userId, id);
      const now = dayjs().toDate();
      await upsertLocalConversation(userId, {
        ...(existing ?? {}),
        id,
        ...args.body,
        updatedAt: now,
      });
      if (userId > GUEST_USER_ID) await mirrorConvIfSynced(userId, id);
      return { id, ...args.body };
    },
    onError: (e) => handleError(e, t),
    onSuccess: (_data, args) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chatMeta(args.id) });
      // Skip the full conv list refetch when only the model changed; model
      // doesn't surface in the list. Title changes still need it.
      if (args.body.title !== undefined) {
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations() });
      }
    },
  });
}

export function useDeleteConversationMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (args: ConvIdArg) => {
      const id = args.id;
      const userId = auth.data?.id ?? GUEST_USER_ID;
      const existing = await readLocalConversation(userId, id);
      const wasSynced = existing?.syncExpiresAt != null;
      await deleteLocalConversation(userId, id);
      await unmirrorIfSynced(userId, "conversations", id, wasSynced);
      return { id };
    },
    onError: (e) => handleError(e, t),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations() });
      queryClient.invalidateQueries({ queryKey: queryKeys.syncState() });
    },
  });
}

export function useTaskStatusQuery(taskId: string, enabled = false) {
  return useQuery({
    queryKey: queryKeys.taskStatus(taskId),
    queryFn: async () => {
      return handleElysia(await rpc.api.ai.chat.task({ taskId }).get());
    },
    enabled: enabled && !!taskId,
    retry: false,
  });
}

export function useFinalizeTaskMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (args: {
      convId: string;
      msgId: string;
      taskId: string;
      resultUrl: string;
    }) => {
      const userId = auth.data?.id ?? GUEST_USER_ID;
      const data = handleElysia(
        await rpc.api.ai.chat({ id: args.convId }).task.finalize.post({
          msgId: args.msgId,
          taskId: args.taskId,
          resultUrl: args.resultUrl,
        }),
      );
      // Local writeback: the server rewrote the task placeholder into a
      // text item with the R2-hosted video markdown. Mirror that locally
      // so the UI doesn't stay on the task placeholder until the next
      // sync pull.
      await replaceLocalMessageItems(userId, args.msgId, [
        {
          id: uid(),
          messageId: args.msgId,
          sequenceIndex: 0,
          outputIndex: null,
          type: "text",
          data: { text: `![video](${args.resultUrl})` },
        },
      ]);
      if (userId > GUEST_USER_ID) {
        await mirrorConvIfSynced(userId, args.convId);
      }
      return data;
    },
    onError: (e) => handleError(e, t),
    onSuccess: (_data, args) => {
      qc.invalidateQueries({ queryKey: queryKeys.chatMessages(args.convId) });
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
      body: EditMessageBody;
    }) => {
      const userId = auth.data?.id ?? GUEST_USER_ID;
      const itemsWithMsg = args.body.items.map((it, seq) => ({
        id: it.id ?? uid(),
        messageId: args.msgId,
        sequenceIndex: seq,
        outputIndex: it.output_index ?? null,
        type: it.type,
        data: it.data,
      }));
      await replaceLocalMessageItems(userId, args.msgId, itemsWithMsg);
      const now = dayjs().toDate();
      const msgs = (await readLocalMessages(userId, args.convId)) ?? [];
      const existing = msgs.find((m) => m.id === args.msgId);
      const updatedMsg = existing
        ? { ...existing, isEdited: true, updatedAt: now }
        : null;
      if (updatedMsg) {
        await upsertLocalMessage(userId, updatedMsg);
      }
      if (userId > GUEST_USER_ID) {
        await mirrorConvDeltaIfSynced(
          userId,
          args.convId,
          {
            messages: updatedMsg ? [updatedMsg] : [],
            messageItems: itemsWithMsg,
          },
          "upsert",
        );
      }
      return { items: itemsWithMsg };
    },
    onSuccess: (_data, args) => {
      qc.invalidateQueries({ queryKey: queryKeys.chatMessages(args.convId) });
    },
  });
}

export function useClearConversationMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    onError: (e) => handleError(e, t),
    mutationFn: async (args: ConvIdArg) => {
      const id = args.id;
      const userId = auth.data?.id ?? GUEST_USER_ID;
      await deleteLocalMessagesForConv(userId, id);
      if (userId > GUEST_USER_ID) await mirrorConvIfSynced(userId, id);
      return { id };
    },
    onSuccess: (_data, args) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chatMessages(args.id),
      });
      chatStore.get(chatHelpersAtom)?.setMessages(() => []);
    },
  });
}

export function useDuplicateConversationMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    onError: (e) => handleError(e, t),
    mutationFn: async (args: ConvIdArg) => {
      const userId = auth.data?.id ?? GUEST_USER_ID;
      const srcId = args.id;
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations() });
    },
  });
}

export function useConversationMarkdown() {
  const t = useTranslations();
  return useMutation({
    onError: (e) => handleError(e, t),
    mutationFn: async (args: ConvIdArg) => {
      return handleElysia(
        await rpc.api.ai.chat({ id: args.id }).markdown.get(),
      );
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
      const userId = auth.data?.id ?? GUEST_USER_ID;
      const msgs = (await readLocalMessages(userId, args.convId)) ?? [];
      const target = msgs.find((m) => m.id === args.msgId);
      const parentId = target?.parentId ?? null;
      const now = dayjs().toDate();
      const branchSiblings: Array<Record<string, unknown>> = [];
      for (const m of msgs) {
        if ((m.parentId ?? null) === parentId) {
          const next = {
            ...m,
            isActiveBranch: m.id === args.msgId,
            updatedAt: now,
          };
          await upsertLocalMessage(userId, next);
          branchSiblings.push(next);
        }
      }
      if (userId > GUEST_USER_ID) {
        await mirrorConvDeltaIfSynced(
          userId,
          args.convId,
          { messages: branchSiblings },
          "upsert",
        );
      }
      return { id: args.msgId };
    },
    onSuccess: (_data, args) => {
      qc.invalidateQueries({ queryKey: queryKeys.chatMessages(args.convId) });
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
      const userId = auth.data?.id ?? GUEST_USER_ID;
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
      if (userId > GUEST_USER_ID)
        await mirrorConvIfSynced(userId, args.convId);
      return { id: args.msgId };
    },
    onSuccess: (_data, args) => {
      qc.invalidateQueries({ queryKey: queryKeys.chatMessages(args.convId) });
    },
  });
}
