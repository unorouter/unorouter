import { enqueuePending } from "@/lib/db/client/sync/pending-sync";
import {
  readLocalConversation,
  readLocalConversationBundle,
  readLocalMessageItems,
  readLocalMessages,
  upsertLocalConversation,
  upsertLocalMessage,
  upsertLocalMessageItem,
} from "@/lib/db/client/data/chat";
import type {
  ApiMessage,
  PersistMessage,
} from "@/lib/ai/chat/messages";
import { itemsToParts, partsToItems } from "@/lib/ai/chat/messages";
import {
  moveConvToTop,
  type ConvsInfinite,
} from "@/lib/react-query/conv-cache";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { ChatMessageMetadata } from "@/lib/types";
import { handleElysia, uid } from "@/lib/utils/base";
import { chatModelAtom, chatStore } from "@/store/chat-store";
import type {
  MessageFormatAdapter,
  MessageFormatItem,
  MessageFormatRepository,
  ThreadHistoryAdapter,
} from "@assistant-ui/core";
import type { QueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";

type RawMessage = ApiMessage;

function buildRepository<TMessage>(
  raw: RawMessage[],
  formatAdapter: MessageFormatAdapter<TMessage, Record<string, unknown>>,
): MessageFormatRepository<TMessage> {
  const messages = raw.map<MessageFormatItem<TMessage>>((m) => {
    const parts = itemsToParts(m.items ?? []);
    const decoded = formatAdapter.decode({
      id: m.id,
      parent_id: m.parentId ?? null,
      format: formatAdapter.format,
      content: { role: m.role, parts } as Record<string, unknown>,
    });
    return decoded;
  });

  const activeTip = [...raw].reverse().find((m) => m.isActiveBranch !== false);
  const headId =
    activeTip?.id ?? (raw.length > 0 ? raw[raw.length - 1].id : null);
  return { headId, messages };
}

async function mirrorConvIfSynced(userId: number, convId: string) {
  const conv = await readLocalConversation(userId, convId);
  if (conv?.syncExpiresAt == null) return;
  const bundle = await readLocalConversationBundle(userId, convId);
  if (!bundle) return;
  try {
    handleElysia(
      await rpc.api.ai
        .sync({ kind: "conversations" })({ id: convId })
        .post({ payload: bundle, keepExpiry: true }),
    );
  } catch (err) {
    await enqueuePending(userId, "conversations", convId, "patch", err);
  }
}

export function createChatHistoryAdapter(
  queryClient: QueryClient,
  getConvId: () => string | null,
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
          const id = getConvId();
          if (!id) return { messages: [] };
          const userId = getUserId();

          type MsgPage = { messages: RawMessage[]; total: number };
          type Cached = { pages: MsgPage[]; pageParams: number[] };

          let allMessages: RawMessage[] = [];
          const cached = queryClient.getQueryData<Cached>(
            queryKeys.chatMessages(id),
          );
          if (cached) {
            allMessages = cached.pages.flatMap((p) => p.messages);
          } else {
            const msgs = (await readLocalMessages(userId, id)) ?? [];
            const items = (await readLocalMessageItems(userId, id)) ?? [];
            const byMsg = new Map<string, typeof items>();
            for (const it of items) {
              const arr = byMsg.get(it.messageId) ?? [];
              arr.push(it);
              byMsg.set(it.messageId, arr);
            }
            allMessages = msgs.map(
              (m) =>
                ({
                  ...m,
                  items: byMsg.get(m.id) ?? [],
                }) as unknown as RawMessage,
            );
            queryClient.setQueryData(queryKeys.chatMessages(id), {
              pages: [{ messages: allMessages, total: allMessages.length }],
              pageParams: [1],
            });
          }

          return buildRepository(
            allMessages,
            formatAdapter as unknown as MessageFormatAdapter<
              TMessage,
              Record<string, unknown>
            >,
          );
        },

        async append(item: MessageFormatItem<TMessage>) {
          const id = getConvId();
          const userId = getUserId();
          if (!id) return;

          const stored = formatAdapter.encode(item);
          const messageId = formatAdapter.getId(item.message);
          const content = stored as unknown as {
            role: PersistMessage["role"];
            parts: { type: string; [k: string]: unknown }[];
            model?: string;
          };

          const items = partsToItems(content.parts ?? []);
          const resolvedModel =
            typeof content.model === "string"
              ? content.model
              : content.role === "assistant"
                ? chatStore.get(chatModelAtom)
                : null;

          const now = dayjs().toDate();

          // Assistant turns carry usage in `message.metadata.usage` once the
          // stream's finish frame writes via `messageMetadata` (stream.service).
          const usage =
            (item.message as { metadata?: ChatMessageMetadata }).metadata
              ?.usage ?? null;

          await upsertLocalMessage(userId, {
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
          });

          const itemRows = items.map((it, seq) => ({
            id: it.id ?? uid(),
            messageId,
            sequenceIndex: seq,
            outputIndex: it.output_index ?? null,
            type: it.type,
            data: it.data as unknown,
            createdAt: now,
          }));
          for (const row of itemRows) {
            await upsertLocalMessageItem(userId, row);
          }

          // Bump conv totals + updatedAt. Row may not exist yet for a brand
          // new guest conv (initialize runs in parallel); upsert seeds it.
          const existing = await readLocalConversation(userId, id);
          await upsertLocalConversation(userId, {
            ...(existing ?? {}),
            id,
            totalInputTokens:
              (existing?.totalInputTokens ?? 0) + (usage?.inputTokens ?? 0),
            totalOutputTokens:
              (existing?.totalOutputTokens ?? 0) + (usage?.outputTokens ?? 0),
            totalCost: (existing?.totalCost ?? 0) + (usage?.cost ?? 0),
            updatedAt: now,
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.chatMeta(id),
          });

          // Cache patches
          type MsgPage = {
            messages: Array<Record<string, unknown>>;
            total: number;
          };
          queryClient.setQueryData<{ pages: MsgPage[]; pageParams: unknown[] }>(
            queryKeys.chatMessages(id),
            (old) => {
              const newMessage = {
                id: messageId,
                parentId: item.parentId,
                role: content.role,
                items: itemRows.map((it) => ({
                  id: it.id,
                  sequenceIndex: it.sequenceIndex,
                  outputIndex: it.outputIndex,
                  type: it.type,
                  data: it.data,
                })),
                model: resolvedModel,
                inputTokens: usage?.inputTokens ?? null,
                outputTokens: usage?.outputTokens ?? null,
                cost: usage?.cost ?? null,
                isActiveBranch: true,
                isEdited: false,
              };
              if (!old?.pages[0]) {
                return {
                  pages: [
                    {
                      messages: [newMessage],
                      total: 1,
                    },
                  ],
                  pageParams: [1],
                };
              }
              const firstPage = old.pages[0];
              return {
                ...old,
                pages: [
                  {
                    ...firstPage,
                    messages: [...firstPage.messages, newMessage],
                  },
                  ...old.pages.slice(1),
                ],
              };
            },
          );

          queryClient.setQueryData<ConvsInfinite>(
            queryKeys.conversations(),
            (old) =>
              moveConvToTop(old, id, (prev) => ({
                updatedAt: now,
                ...(usage?.cost && {
                  totalCost: (prev.totalCost ?? 0) + usage.cost,
                }),
              })),
          );

          await mirrorConvIfSynced(userId, id);
        },
      };
    },
  };
}
