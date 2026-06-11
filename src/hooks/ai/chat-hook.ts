"use client";

import { useElysiaQuery } from "@/hooks/use-elysia-query";

import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { joinItemsToMessages } from "@/lib/ai/chat/messages";
import { GUEST_USER_ID, PAGE_SIZE } from "@/lib/config/constants";
import { invalidateAndBroadcast } from "@/lib/react-query/cross-tab-invalidate";
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
  updateLocalConversationSettings,
  upsertLocalConversation,
  upsertLocalConversationSettings,
  upsertLocalMessage,
  upsertLocalMessageItem,
} from "@/lib/db/client/data/chat";
import {
  mirrorConvIfSynced,
  mirrorConvMessagesIfSynced,
  mirrorConvRowIfSynced,
  unmirrorIfSynced,
} from "@/lib/db/client/sync/mirror";
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

// Shared mutation scaffold: resolve userId, i18n error toast, invalidate +
// broadcast the per-args keys on success. Every chat mutation rides this.
function useChatMutation<TArgs, TData>(
  fn: (userId: number, args: TArgs) => Promise<TData>,
  keysFor: (args: TArgs) => readonly (readonly unknown[])[],
  onAfter?: () => void,
) {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: (args: TArgs) => fn(auth.data?.id ?? GUEST_USER_ID, args),
    onError: (e) => handleError(e, t),
    onSuccess: (_data, args) => {
      invalidateAndBroadcast(qc, keysFor(args) as string[][]);
      onAfter?.();
    },
  });
}

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

// History rewrites must bump the conversation row: reconcile staleness on
// other devices keys on conversations.updatedAt, so an edit/branch/delete
// that only touches message rows would otherwise never propagate.
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
      // Patch-only: a rename/model change targets an existing row. Going
      // through upsert would, on a missing row, attempt a candidate insert with
      // null default_model and trip its NOT NULL constraint.
      if (existing) {
        await updateLocalConversationSettings(userId, {
          convId: args.id,
          ...patch,
        });
        // Row patch; never re-upload the whole conversation for a rename.
        await mirrorConvRowIfSynced(userId, args.id);
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
      const existing = await readLocalConversation(userId, args.id);
      const wasSynced = existing?.syncExpiresAt != null;
      await deleteLocalConversation(userId, args.id);
      await unmirrorIfSynced(userId, "conversations", args.id, wasSynced);
      return { id: args.id };
    },
    () => [queryKeys.conversations(), queryKeys.syncState()],
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
      // Mirror the server's task-to-text rewrite locally so the UI doesn't
      // stay on the placeholder until the next sync pull.
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
      // Full mirror: item deltas only wipe stale siblings when a messages array
      // rides along; finalize is rare (one per video), bundle push is simplest.
      await mirrorConvIfSynced(userId, args.convId);
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
      await bumpConvUpdatedAt(userId, args.convId);
      await mirrorConvMessagesIfSynced(userId, args.convId, [args.msgId], true);
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
      await mirrorConvIfSynced(userId, args.id);
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
      // Root assistant siblings are greetings: track Risu fmIndex
      // (branchIndex 0 = firstMessage -> -1, i = alternateGreetings[i-1]).
      if (parentId === null && target?.role === "assistant") {
        await updateLocalConversationSettings(userId, {
          convId: args.convId,
          firstMsgIndex: (target.branchIndex ?? 0) - 1,
        });
      }
      await bumpConvUpdatedAt(userId, args.convId);
      await mirrorConvMessagesIfSynced(
        userId,
        args.convId,
        branchSiblings.map((m) => String(m.id)),
        true,
      );
      return { id: args.msgId };
    },
    (args) => [queryKeys.chatMessages(args.convId)],
  );
}

export function useDeleteMessageMutation() {
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
      await mirrorConvIfSynced(userId, args.convId);
      return { id: args.msgId };
    },
    (args) => [queryKeys.chatMessages(args.convId)],
  );
}
