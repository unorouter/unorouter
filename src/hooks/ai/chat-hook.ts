"use client";

import { useElysiaQuery } from "@/lib/react-query/hooks";

import { useLocalUserId } from "@/hooks/auth/use-local-user-id";
import { joinItemsToMessages } from "@/lib/ai/chat/messages";
import { msg, PAGE_SIZE } from "@/lib/config/constants";
import { invalidateAndBroadcast } from "@/lib/react-query/cross-tab-invalidate";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { chatHelpersAtom, chatStore } from "@/store/chat-store";
import { handleElysia, uid } from "@/lib/utils/base";
import { dayjs } from "@/lib/utils/format/date";
import { handleError } from "@/lib/utils/client";
import {
  deleteLocalChatGroup,
  deleteLocalConversation,
  deleteLocalMessage,
  deleteLocalMessagesForConv,
  readLocalChatGroups,
  readLocalConversation,
  readLocalConversationBundle,
  readLocalConversations,
  readLocalMessageItems,
  readLocalMessages,
  renameLocalChatGroup,
  reorderLocalChatGroups,
  replaceLocalConversationBindings,
  replaceLocalMessageItems,
  setChatGroupFolded,
  setConversationGroup,
  updateLocalConversationSettings,
  upsertLocalChatGroup,
  upsertLocalConversation,
  upsertLocalConversationSettings,
  upsertLocalMessage,
  upsertLocalMessageItem,
} from "@/lib/db/client/data/chat";
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

// Shared mutation scaffold for chat mutations: resolve userId, i18n error toast, invalidate + broadcast per-args keys on success.
function useChatMutation<TArgs, TData>(
  fn: (userId: number, args: TArgs) => Promise<TData>,
  keysFor: (args: TArgs) => readonly (readonly unknown[])[],
  onAfter?: () => void,
) {
  const t = useTranslations();
  const qc = useQueryClient();
  const userId = useLocalUserId();
  return useMutation({
    mutationFn: (args: TArgs) => fn(userId, args),
    onError: (e) => handleError(e, t),
    onSuccess: (_data, args) => {
      invalidateAndBroadcast(qc, keysFor(args) as string[][]);
      onAfter?.();
    },
  });
}

export function useConversationsInfiniteQuery(keyword?: string) {
  const userId = useLocalUserId();
  return useInfiniteQuery({
    queryKey: [...queryKeys.conversations(keyword), userId],
    queryFn: async ({ pageParam }) => {
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

export function useChatGroupsQuery() {
  const userId = useLocalUserId();
  return useQuery({
    queryKey: [...queryKeys.chatGroups(), userId],
    queryFn: async () => (await readLocalChatGroups(userId)) ?? [],
  });
}

export function useCreateChatGroupMutation() {
  return useChatMutation(
    async (userId, args: { name: string }) => {
      const id = uid();
      await upsertLocalChatGroup(userId, {
        id,
        name: args.name.trim() || "New group",
      });
      return { id };
    },
    () => [queryKeys.chatGroups()],
  );
}

export function useRenameChatGroupMutation() {
  return useChatMutation(
    async (userId, args: { id: string; name: string }) => {
      await renameLocalChatGroup(userId, args.id, args.name.trim());
      return { id: args.id };
    },
    () => [queryKeys.chatGroups()],
  );
}

export function useDeleteChatGroupMutation() {
  return useChatMutation(
    async (userId, args: { id: string }) => {
      await deleteLocalChatGroup(userId, args.id);
      return { id: args.id };
    },
    // Ungroups its chats, so the conversation list refreshes too.
    () => [queryKeys.chatGroups(), queryKeys.conversations()],
  );
}

export function useReorderChatGroupsMutation() {
  return useChatMutation(
    async (userId, args: { orderedIds: string[] }) => {
      await reorderLocalChatGroups(userId, args.orderedIds);
      return {};
    },
    () => [queryKeys.chatGroups()],
  );
}

export function useToggleChatGroupFoldedMutation() {
  return useChatMutation(
    async (userId, args: { id: string; folded: boolean }) => {
      await setChatGroupFolded(userId, args.id, args.folded);
      return { id: args.id };
    },
    () => [queryKeys.chatGroups()],
  );
}

export function useMoveConversationToGroupMutation() {
  return useChatMutation(
    async (userId, args: { convId: string; groupId: string | null }) => {
      await setConversationGroup(userId, args.convId, args.groupId);
      return { id: args.convId };
    },
    () => [queryKeys.conversations()],
  );
}

export function useConversationQuery(id?: string) {
  const userId = useLocalUserId();
  return useQuery({
    queryKey: [...queryKeys.chatMeta(id!), userId],
    queryFn: async () => {
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
  const userId = useLocalUserId();
  return useInfiniteQuery({
    queryKey: [...queryKeys.chatMessages(id!), userId],
    queryFn: async ({ pageParam }) => {
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

// History rewrites must bump the conversation row: cross-device staleness reconciles on conversations.updatedAt.
async function bumpConvUpdatedAt(userId: number, convId: string) {
  const conv = await readLocalConversation(userId, convId);
  if (conv) {
    await upsertLocalConversation(userId, {
      ...conv,
      updatedAt: dayjs().toDate(),
    });
  }
}

export function useUpdateConversationMutation() {
  return useChatMutation(
    async (userId, args: ConvIdArg & { body: UpdateConvBody }) => {
      const existing = await readLocalConversation(userId, args.id);
      const now = dayjs().toDate();
      // `model` is the UI alias for the defaultModel column.
      const patch = {
        ...(args.body.title !== undefined && { title: args.body.title }),
        ...(args.body.model !== undefined && {
          defaultModel: args.body.model,
        }),
        updatedAt: now,
      };
      // Patch-only: a rename/model change targets an existing row. Upsert could insert with null default_model and trip NOT NULL.
      if (existing) {
        await updateLocalConversationSettings(userId, {
          convId: args.id,
          ...patch,
        });
      }
      return { id: args.id, ...args.body };
    },
    (args) =>
      args.body.title !== undefined
        ? [queryKeys.chatMeta(args.id), queryKeys.conversations()]
        : [queryKeys.chatMeta(args.id)],
  );
}

export function useDeleteConversationMutation() {
  return useChatMutation(
    async (userId, args: ConvIdArg) => {
      await deleteLocalConversation(userId, args.id);
      return { id: args.id };
    },
    () => [queryKeys.conversations()],
  );
}

export function useTaskStatusQuery(taskId: string, enabled = false) {
  return useElysiaQuery(
    queryKeys.taskStatus(taskId),
    () => rpc.api.ai.chat.task({ taskId }).get(),
    { enabled: enabled && !!taskId, retry: false },
  );
}

export function useFinalizeTaskMutation() {
  return useChatMutation(
    async (
      userId,
      args: {
        convId: string;
        msgId: string;
        taskId: string;
        resultUrl: string;
      },
    ) => {
      const data = handleElysia(
        await rpc.api.ai.chat({ id: args.convId }).task.finalize.post({
          msgId: args.msgId,
          taskId: args.taskId,
          resultUrl: args.resultUrl,
        }),
      );
      // Mirror the server's task-to-text rewrite locally so the UI leaves the placeholder immediately.
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
      return data;
    },
    (args) => [queryKeys.chatMessages(args.convId)],
  );
}

export function useEditMessageMutation() {
  return useChatMutation(
    async (
      userId,
      args: { convId: string; msgId: string; body: EditMessageBody },
    ) => {
      // Existence check FIRST: a delete (e.g. of the AI response) can splice/drop the
      // row before this edit fires. Writing items under a gone message left orphan rows
      // that showed in runtime state but vanished on refresh (Matic's ghost message).
      const msgs = (await readLocalMessages(userId, args.convId)) ?? [];
      const existing = msgs.find((m) => m.id === args.msgId);
      if (!existing) throw new Error(msg("ERRORS.MESSAGE_NOT_FOUND"));
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
      await upsertLocalMessage(userId, {
        ...existing,
        isEdited: true,
        updatedAt: now,
      });
      await bumpConvUpdatedAt(userId, args.convId);
      return { items: itemsWithMsg };
    },
    (args) => [queryKeys.chatMessages(args.convId)],
  );
}

export function useClearConversationMutation() {
  return useChatMutation(
    async (userId, args: ConvIdArg) => {
      await deleteLocalMessagesForConv(userId, args.id);
      await bumpConvUpdatedAt(userId, args.id);
      return { id: args.id };
    },
    (args) => [queryKeys.chatMessages(args.id)],
    () => chatStore.get(chatHelpersAtom)?.setMessages(() => []),
  );
}

export function useDuplicateConversationMutation() {
  return useChatMutation(
    async (userId, args: ConvIdArg) => {
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
    () => [queryKeys.conversations()],
  );
}

export function useConversationMarkdown() {
  return useChatMutation(
    async (_userId, args: ConvIdArg) =>
      handleElysia(await rpc.api.ai.chat({ id: args.id }).markdown.get()),
    () => [],
  );
}

export function useSetActiveBranchMutation() {
  return useChatMutation(
    async (userId, args: { convId: string; msgId: string }) => {
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
      // Root assistant siblings are greetings: track Risu fmIndex (branch 0 is firstMessage at -1, i is alternate i-1).
      if (parentId === null && target?.role === "assistant") {
        await updateLocalConversationSettings(userId, {
          convId: args.convId,
          firstMsgIndex: (target.branchIndex ?? 0) - 1,
        });
      }
      await bumpConvUpdatedAt(userId, args.convId);
      return { id: args.msgId };
    },
    (args) => [queryKeys.chatMessages(args.convId)],
  );
}

export function useDeleteMessageMutation() {
  const qc = useQueryClient();
  return useChatMutation(
    async (userId, args: { convId: string; msgId: string }) => {
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
      await bumpConvUpdatedAt(userId, args.convId);
      // Drop the stale messages cache so the history adapter's load() re-reads the spliced state from the DB.
      // Invalidate alone leaves getQueryData returning the pre-delete pages, which the runtime would restore on
      // the next load (the message reappeared until a manual refresh). removeQueries forces the DB read.
      qc.removeQueries({ queryKey: queryKeys.chatMessages(args.convId) });
      return { id: args.msgId };
    },
    (args) => [queryKeys.chatMessages(args.convId)],
  );
}
