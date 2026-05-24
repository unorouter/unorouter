import { mirrorConvDeltaIfSynced } from "@/hooks/ai/rp/shared";
import type { ApiMessage, MessagePart } from "@/lib/ai/chat/messages";
import {
  itemsToParts,
  joinItemsToMessages,
  partsToItems,
} from "@/lib/ai/chat/messages";
import {
  readLocalConversation,
  readLocalMessageItems,
  readLocalMessages,
  upsertLocalConversation,
  upsertLocalMessage,
  upsertLocalMessageItem,
} from "@/lib/db/client/data/chat";
import { insertLocalRequestLog } from "@/lib/db/client/data/request-log";
import type { RequestLogRow } from "@/lib/db/schema/rows";
import { queryKeys } from "@/lib/react-query/keys";
import type { ChatMessageMetadata } from "@/lib/types";
import { uid } from "@/lib/utils/base";
import { dayjs } from "@/lib/utils/format/date";
import { chatModelAtom, chatStore, convIdAtom } from "@/store/chat-store";
import type {
  MessageFormatAdapter,
  MessageFormatItem,
  MessageFormatRepository,
  ThreadHistoryAdapter,
} from "@assistant-ui/core";
import type { QueryClient } from "@tanstack/react-query";

// The format adapter's encoded storage shape. `MessageFormatAdapter.encode`
// is typed only as the opaque generic constraint `Record<string, unknown>`,
// so narrowing to the concrete shape `append` needs takes an `unknown` hop.
type EncodedContent = {
  role: "system" | "user" | "assistant" | "tool";
  parts: MessagePart[];
};

function buildRepository<TMessage>(
  raw: ApiMessage[],
  formatAdapter: MessageFormatAdapter<TMessage, Record<string, unknown>>,
): MessageFormatRepository<TMessage> {
  const messages = raw.map<MessageFormatItem<TMessage>>((m) => {
    const parts = itemsToParts(m.items ?? []);
    const decoded = formatAdapter.decode({
      id: m.id,
      parent_id: m.parentId ?? null,
      format: formatAdapter.format,
      content: { role: m.role, parts },
    });
    return decoded;
  });

  const activeTip = [...raw].reverse().find((m) => m.isActiveBranch !== false);
  const headId =
    activeTip?.id ?? (raw.length > 0 ? raw[raw.length - 1].id : null);
  return { headId, messages };
}

export function createChatHistoryAdapter(
  queryClient: QueryClient,
  getUserId: () => number,
): ThreadHistoryAdapter {
  return {
    async load() {
      throw new Error(
        "chat-history-adapter: outer load() should not be called; use withFormat()",
      );
    },

    async append() {
      throw new Error(
        "chat-history-adapter: outer append() should not be called; use withFormat()",
      );
    },

    withFormat<TMessage, TStorageFormat extends Record<string, unknown>>(
      formatAdapter: MessageFormatAdapter<TMessage, TStorageFormat>,
    ) {
      return {
        async load(): Promise<MessageFormatRepository<TMessage>> {
          const id = chatStore.get(convIdAtom);
          if (!id) return { messages: [] };
          const userId = getUserId();

          type MsgPage = { messages: ApiMessage[]; total: number };
          type Cached = { pages: MsgPage[]; pageParams: number[] };

          let allMessages: ApiMessage[] = [];
          const cached = queryClient.getQueryData<Cached>(
            queryKeys.chatMessages(id),
          );
          if (cached) {
            allMessages = cached.pages.flatMap((p) => p.messages);
          } else {
            const msgs = (await readLocalMessages(userId, id)) ?? [];
            const items = (await readLocalMessageItems(userId, id)) ?? [];
            allMessages = joinItemsToMessages(msgs, items);
          }

          return buildRepository(allMessages, formatAdapter);
        },

        async append(item: MessageFormatItem<TMessage>) {
          const id = chatStore.get(convIdAtom);
          const userId = getUserId();
          if (!id) return;

          const messageId = formatAdapter.getId(item.message);
          const content = formatAdapter.encode(
            item,
          ) as unknown as EncodedContent;

          const items = partsToItems(content.parts);
          const resolvedModel =
            content.role === "assistant"
              ? chatStore.get(chatModelAtom)
              : null;

          const now = dayjs().toDate();

          // Assistant turns carry usage in `message.metadata.usage` once the
          // stream's finish frame writes via `messageMetadata` (stream.service).
          const metadata =
            (item.message as { metadata?: ChatMessageMetadata }).metadata ??
            null;
          const usage = metadata?.usage ?? null;
          const debug = metadata?.debug ?? null;

          const newMessage = {
            id: messageId,
            convId: id,
            parentId: item.parentId ?? null,
            role: content.role,
            model: resolvedModel,
            inputTokens: usage?.inputTokens ?? null,
            outputTokens: usage?.outputTokens ?? null,
            cost: usage?.cost ?? null,
            isActiveBranch: true,
            isEdited: false,
            branchIndex: 0,
            createdAt: now,
            updatedAt: now,
          };
          await upsertLocalMessage(userId, newMessage);

          const itemRows = items.map((it, seq) => ({
            id: it.id ?? uid(),
            messageId,
            sequenceIndex: seq,
            outputIndex: it.output_index ?? null,
            type: it.type,
            data: it.data,
            createdAt: now,
          }));
          for (const row of itemRows) {
            await upsertLocalMessageItem(userId, row);
          }

          // Persist outgoing request snapshot for in-app debugging (RisuAI
          // Logs analog). Merges typed debug payload + usage; cascade-deletes
          // with parent message via FK.
          const logRow: RequestLogRow | null = debug
            ? {
                ...debug,
                msgId: messageId,
                convId: id,
                inputTokens: usage?.inputTokens ?? null,
                outputTokens: usage?.outputTokens ?? null,
                cost: usage?.cost ?? null,
                durationMs: usage?.durationMs ?? null,
                tokensPerSecond: usage?.tokensPerSecond ?? null,
                createdAt: now,
              }
            : null;
          if (logRow) {
            await insertLocalRequestLog(userId, logRow);
            queryClient.invalidateQueries({
              queryKey: queryKeys.requestLog(messageId),
            });
          }

          // Bump conv totals + updatedAt. Row may not exist yet for a brand
          // new guest conv (initialize runs in parallel); upsert seeds it.
          const existing = await readLocalConversation(userId, id);
          const updatedConv = {
            ...(existing ?? {}),
            id,
            totalInputTokens:
              (existing?.totalInputTokens ?? 0) + (usage?.inputTokens ?? 0),
            totalOutputTokens:
              (existing?.totalOutputTokens ?? 0) + (usage?.outputTokens ?? 0),
            totalCost: (existing?.totalCost ?? 0) + (usage?.cost ?? 0),
            updatedAt: now,
          };
          await upsertLocalConversation(userId, updatedConv);
          queryClient.invalidateQueries({ queryKey: queryKeys.chatMeta(id) });
          queryClient.invalidateQueries({
            queryKey: queryKeys.chatMessages(id),
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.conversations(),
          });

          await mirrorConvDeltaIfSynced(
            userId,
            id,
            {
              conversation: updatedConv,
              messages: [newMessage],
              messageItems: itemRows,
              ...(logRow ? { requestLogs: [logRow] } : {}),
            },
            "append",
          );
        },
      };
    },
  };
}
