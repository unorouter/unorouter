import { PAGE_SIZE } from "@/lib/config/constants";
import {
  moveConvToTop,
  type ConvsInfinite,
} from "@/lib/react-query/conv-cache";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { PersistMessage } from "@/lib/types/chat";
import { handleElysia } from "@/lib/utils/base";
import type {
  MessageFormatAdapter,
  MessageFormatItem,
  MessageFormatRepository,
  ThreadHistoryAdapter,
} from "@assistant-ui/core";
import type { QueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";

type RawMessage = {
  id: string;
  parentId?: string | null;
  role: string;
  parts: unknown;
  model?: string | null;
};

function buildRepository<TMessage>(
  raw: RawMessage[],
  formatAdapter: MessageFormatAdapter<TMessage, Record<string, unknown>>,
): MessageFormatRepository<TMessage> {
  // Walk DB rows chronologically, prefer the newest sibling when two share a parent — that becomes the active branch tip on load
  const messages = raw.map<MessageFormatItem<TMessage>>((m) => {
    const decoded = formatAdapter.decode({
      id: m.id,
      parent_id: m.parentId ?? null,
      format: formatAdapter.format,
      content: { role: m.role, parts: m.parts } as Record<string, unknown>,
    });
    return decoded;
  });

  const headId = raw.length > 0 ? raw[raw.length - 1].id : null;
  return { headId, messages };
}

export function createChatHistoryAdapter(
  queryClient: QueryClient,
  getConvId: () => string | null,
): ThreadHistoryAdapter {
  return {
    async load() {
      // Raw shape lives here; the assistant-ui hook pipes it through withFormat() before calling this — but load() on the outer type must return ExportedMessageRepository.
      // We return an empty outer, since useExternalHistory uses withFormat().load() (not this one) when a format adapter exists.
      return { messages: [] };
    },

    async append() {
      // Same: unused when withFormat() is provided.
    },

    withFormat<TMessage, TStorageFormat extends Record<string, unknown>>(
      formatAdapter: MessageFormatAdapter<TMessage, TStorageFormat>,
    ) {
      return {
        async load(): Promise<MessageFormatRepository<TMessage>> {
          const id = getConvId();
          if (!id) return { messages: [] };

          type MsgPage = { messages: RawMessage[]; total: number };
          type Cached = { pages: MsgPage[]; pageParams: number[] };

          const cached = queryClient.getQueryData<Cached>(
            queryKeys.chatMessages(id),
          );

          // Start from the hydrated cache and only fetch what's missing
          const allMessages: RawMessage[] = cached
            ? cached.pages.flatMap((p) => p.messages)
            : [];
          const lastCachedPage = cached?.pages.at(-1);
          const startPage = cached ? cached.pages.length + 1 : 1;
          const cacheIsComplete =
            !!lastCachedPage && lastCachedPage.messages.length < PAGE_SIZE;

          if (!cacheIsComplete) {
            let page = startPage;
            while (true) {
              const data = handleElysia(
                await rpc.api.chat({ id }).get({
                  query: { p: page, page_size: PAGE_SIZE },
                }),
              );
              allMessages.push(...(data.messages as RawMessage[]));
              if (data.messages.length < PAGE_SIZE) break;
              page++;
            }

            // Seed the react-query cache so other hooks (totals, title, etc.) keep working
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
          if (!id) return;

          const stored = formatAdapter.encode(item);
          const messageId = formatAdapter.getId(item.message);
          const content = stored as unknown as {
            role: PersistMessage["role"];
            parts: PersistMessage["parts"];
            [k: string]: unknown;
          };

          const body = {
            messages: [
              {
                id: messageId,
                parentId: item.parentId,
                role: content.role,
                parts: content.parts,
                ...(typeof content.model === "string"
                  ? { model: content.model }
                  : {}),
              },
            ],
          };

          const result = handleElysia(
            await rpc.api.chat({ id }).messages.post(
              body as unknown as {
                messages: PersistMessage[];
              },
            ),
          );

          // Mirror the cache updates that usePersistMessagesMutation used to perform
          type MsgPage = {
            messages: Array<Record<string, unknown>>;
            total: number;
          };
          queryClient.setQueryData<{ pages: MsgPage[]; pageParams: unknown[] }>(
            queryKeys.chatMessages(id),
            (old) => {
              if (!old?.pages[0]) return old;
              const usage = result.usage;
              const hasUsage = content.role === "assistant" && usage;
              const newMessage = {
                id: messageId,
                parentId: item.parentId,
                role: content.role,
                parts: content.parts,
                model: typeof content.model === "string" ? content.model : null,
                inputTokens: hasUsage ? usage.inputTokens : null,
                outputTokens: hasUsage ? usage.outputTokens : null,
                cost: hasUsage ? usage.cost : null,
              };
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
                updatedAt: dayjs().toDate(),
                ...(result.title && { title: result.title }),
                ...(result.usage?.cost && {
                  totalCost: (prev.totalCost ?? 0) + result.usage.cost,
                }),
              })),
          );

          if (result.usage) {
            type ConvMeta = {
              totalInputTokens?: number;
              totalOutputTokens?: number;
              totalCost?: number;
              [k: string]: unknown;
            };
            queryClient.setQueryData<ConvMeta>(
              queryKeys.chatMeta(id),
              (old) => {
                if (!old) return old;
                return {
                  ...old,
                  totalInputTokens:
                    (old.totalInputTokens ?? 0) + result.usage!.inputTokens,
                  totalOutputTokens:
                    (old.totalOutputTokens ?? 0) + result.usage!.outputTokens,
                  totalCost: (old.totalCost ?? 0) + result.usage!.cost,
                };
              },
            );
          }
        },
      };
    },
  };
}
