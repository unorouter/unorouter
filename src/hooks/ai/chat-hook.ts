"use client";

import { useElysiaQuery } from "@/lib/react-query/hooks";

import { msg, PAGE_SIZE } from "@/lib/config/constants";
import { invalidateAndBroadcast } from "@/lib/react-query/cross-tab-invalidate";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import {
  clearLiveError,
  getThreadRuntime,
  reloadLiveThreadFromDb,
  setLiveMessages,
} from "@/store/chat-store";
import { handleElysia, uid } from "@/lib/utils/base";
import { dayjs } from "@/lib/utils/format/date";
import { handleError } from "@/lib/utils/client";
import {
  deleteLocalChatGroup,
  deleteLocalConversation,
  bumpLocalConvUpdatedAt,
  deleteLocalMessagesForConv,
  readLocalChatGroups,
  readLocalConversation,
  readLocalConversationBundle,
  readLocalConversations,
  readLocalMessages,
  setLocalActiveBranch,
  spliceDeleteLocalMessage,
  renameLocalChatGroup,
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
  readJoinedMessages,
} from "@/lib/db/client/data/chat/chat";
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

function useChatMutation<TArgs, TData>(
  fn: (args: TArgs) => Promise<TData>,
  keysFor: (args: TArgs) => readonly (readonly unknown[])[],
  onAfter?: (data: TData, args: TArgs) => void,
) {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: TArgs) => fn(args),
    onError: (e) => handleError(e, t),
    onSuccess: (data, args) => {
      invalidateAndBroadcast(qc, keysFor(args));
      onAfter?.(data, args);
    },
  });
}

export function useConversationsInfiniteQuery(keyword?: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.conversations(keyword),
    queryFn: async ({ pageParam }) => {
      const local = (await readLocalConversations()) ?? [];
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
  return useQuery({
    queryKey: queryKeys.chatGroups(),
    queryFn: async () => (await readLocalChatGroups()) ?? [],
  });
}

export function useCreateChatGroupMutation() {
  return useChatMutation(
    async (args: { name: string }) => {
      const id = uid();
      await upsertLocalChatGroup({
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
    async (args: { id: string; name: string }) => {
      await renameLocalChatGroup(args.id, args.name.trim());
      return { id: args.id };
    },
    () => [queryKeys.chatGroups()],
  );
}

export function useDeleteChatGroupMutation() {
  return useChatMutation(
    async (args: { id: string }) => {
      await deleteLocalChatGroup(args.id);
      return { id: args.id };
    },
    () => [queryKeys.chatGroups(), queryKeys.conversations()],
  );
}

export function useToggleChatGroupFoldedMutation() {
  return useChatMutation(
    async (args: { id: string; folded: boolean }) => {
      await setChatGroupFolded(args.id, args.folded);
      return { id: args.id };
    },
    () => [queryKeys.chatGroups()],
  );
}

export function useMoveConversationToGroupMutation() {
  return useChatMutation(
    async (args: { convId: string; groupId: string | null }) => {
      await setConversationGroup(args.convId, args.groupId);
      return { id: args.convId };
    },
    () => [queryKeys.conversations()],
  );
}

export function useConversationQuery(id?: string) {
  return useQuery({
    queryKey: queryKeys.chatMeta(id!),
    queryFn: async () => {
      if (id) {
        const local = await readLocalConversation(id);
        if (local) return local;
      }
      throw new Error("chat-not-found");
    },
    enabled: !!id,
    retry: false,
  });
}

export function useMessagesInfiniteQuery(id?: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.chatMessages(id!),
    queryFn: async ({ pageParam }) => {
      if (!id)
        return { messages: [], total: 0, page: pageParam, pageSize: PAGE_SIZE };
      const messages = await readJoinedMessages(id);
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
  return useChatMutation(
    async (args: ConvIdArg & { body: UpdateConvBody }) => {
      const existing = await readLocalConversation(args.id);
      const now = dayjs().toDate();
      const patch = {
        ...(args.body.title !== undefined && { title: args.body.title }),
        ...(args.body.model !== undefined && {
          defaultModel: args.body.model,
        }),
        updatedAt: now,
      };
      if (existing) {
        await updateLocalConversationSettings({
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
    async (args: ConvIdArg) => {
      await deleteLocalConversation(args.id);
      return { id: args.id };
    },
    () => [queryKeys.conversations()],
  );
}

export function useTaskStatusQuery(
  taskId: string,
  enabled = false,
  pollInterval: number | false = false,
) {
  return useElysiaQuery(
    queryKeys.taskStatus(taskId),
    () => rpc.api.ai.chat.task({ taskId }).get(),
    {
      enabled: enabled && !!taskId,
      retry: false,
      // FAILURE is the one terminal state that never finalizes away the card,
      // so it is the only status that stops the poll.
      refetchInterval: (query) =>
        query.state.data?.status === "FAILURE" ? false : pollInterval,
      refetchIntervalInBackground: true,
    },
  );
}

export function useFinalizeTaskMutation() {
  return useChatMutation(
    async (args: {
      convId: string;
      msgId: string;
      taskId: string;
      resultUrl: string;
    }) => {
      const data = handleElysia(
        await rpc.api.ai.chat.task.finalize.post({
          msgId: args.msgId,
          taskId: args.taskId,
          resultUrl: args.resultUrl,
        }),
      );
      await replaceLocalMessageItems(args.msgId, [
        {
          id: uid(),
          messageId: args.msgId,
          sequenceIndex: 0,
          outputIndex: null,
          type: "text",
          data: {
            text: `![${data.kind === "image" ? "image" : "video"}](${data.url})`,
          },
        },
      ]);
      return data;
    },
    (args) => [queryKeys.chatMessages(args.convId)],
  );
}

export function useEditMessageMutation() {
  return useChatMutation(
    async (args: { convId: string; msgId: string; body: EditMessageBody }) => {
      const msgs = (await readLocalMessages(args.convId)) ?? [];
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
      await replaceLocalMessageItems(args.msgId, itemsWithMsg);
      const now = dayjs().toDate();
      await upsertLocalMessage({
        ...existing,
        isEdited: true,
        updatedAt: now,
      });
      await bumpLocalConvUpdatedAt(args.convId);
      return { items: itemsWithMsg };
    },
    (args) => [queryKeys.chatMessages(args.convId)],
  );
}

export function useClearConversationMutation() {
  return useChatMutation(
    async (args: ConvIdArg) => {
      await deleteLocalMessagesForConv(args.id);
      await bumpLocalConvUpdatedAt(args.id);
      return { id: args.id };
    },
    (args) => [queryKeys.chatMessages(args.id)],
    () => setLiveMessages(() => []),
  );
}

export function useDuplicateConversationMutation() {
  return useChatMutation(
    async (args: ConvIdArg) => {
      const srcId = args.id;
      const bundle = await readLocalConversationBundle(srcId);
      if (!bundle) throw new Error("not-found");
      const now = dayjs().toDate();
      const newId = uid();
      const idMap = new Map<string, string>();
      const newConv = {
        ...bundle.conversation,
        id: newId,
        createdAt: now,
        updatedAt: now,
      };
      await upsertLocalConversation(newConv);
      if (bundle.settings) {
        await upsertLocalConversationSettings({
          ...bundle.settings,
          convId: newId,
        });
      }
      await replaceLocalConversationBindings(newId, {
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
        await upsertLocalMessage({
          ...m,
          id: idMap.get(m.id)!,
          convId: newId,
          parentId: m.parentId ? (idMap.get(m.parentId) ?? null) : null,
        });
      }
      for (const it of bundle.messageItems) {
        const newMsgId = idMap.get(it.messageId);
        if (!newMsgId) continue;
        await upsertLocalMessageItem({
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

export function useSetActiveBranchMutation() {
  return useChatMutation(
    async (args: { convId: string; msgId: string }) => {
      await setLocalActiveBranch(args.convId, args.msgId);
      return { id: args.msgId };
    },
    (args) => [queryKeys.chatMessages(args.convId)],
  );
}

export function useDeleteMessageMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { convId: string; msgId: string }) => {
      // Prune UI before the awaited splice: the node may have no DB row.
      getThreadRuntime()?.deleteMessage(args.msgId);
      // deleteMessage prunes the runtime repository, but the RENDER SOURCE (and
      // the history the transport sends) is the useChat array. Drop the node
      // from it here, BEFORE the await: a failed-run node can have no DB row and
      // the SQLocal splice can throw on iOS, and a throw past this point would
      // leave a deleted message on screen and still in the model's history.
      setLiveMessages((msgs) =>
        (msgs as { id?: string }[]).filter((m) => m.id !== args.msgId),
      );
      clearLiveError();
      qc.removeQueries({ queryKey: queryKeys.chatMessages(args.convId) });
      await spliceDeleteLocalMessage(args.convId, args.msgId);
      // The DB is authoritative once the splice lands: rebuild from it so a
      // branch re-walk (siblings promoted after the delete) is reflected too.
      // Best-effort, since the prune above already removed the node: a throwing
      // reader must not report a delete that actually succeeded as failed.
      try {
        await reloadLiveThreadFromDb(args.convId);
      } catch {
        // Already pruned from the live array; the next mount reads the DB.
      }
      return { id: args.msgId };
    },
    onError: (e) => handleError(e, t),
    onSuccess: (_data, args) => {
      invalidateAndBroadcast(qc, [queryKeys.chatMessages(args.convId)]);
    },
  });
}
