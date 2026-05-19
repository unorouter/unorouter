import { GUEST_USER_ID, PAGE_SIZE } from "@/lib/config/constants";
import {
  readLocalConversation,
  readLocalConversations,
} from "@/lib/db/client/reads";
import {
  deleteLocalConversation,
  upsertLocalConversation,
  upsertLocalConversationSettings,
} from "@/lib/db/client/writes";
import { enqueuePending } from "@/lib/db/client/pending-sync";
import {
  patchConv,
  prependConv,
  removeConv,
  type ConvItem,
  type ConvsInfinite,
} from "@/lib/react-query/conv-cache";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia, uid } from "@/lib/utils/base";
import { handleError } from "@/lib/utils/client";
import dayjs from "dayjs";
import {
  getChatDefaults,
  getChatModel,
  getConvId,
  setConvId,
} from "@/store/chat-store";
import type { RemoteThreadListAdapter } from "@assistant-ui/react";
import type { QueryClient } from "@tanstack/react-query";
import type { useTranslations } from "next-intl";
import { createAssistantStream } from "assistant-stream";
import { extractFirstUserText } from "./chat-utils";

// Pure local-first thread adapter. Conversations live in SQLocal first; the
// only network calls left are: (1) optional sync mirror on synced rows, and
// (2) stateless title generation. New conversations never touch Turso until
// the user explicitly clicks Sync.

export function createThreadListAdapter(
  queryClient: QueryClient,
  t: ReturnType<typeof useTranslations<never>>,
  userId: number,
): RemoteThreadListAdapter {
  return {
    async list() {
      const cached = queryClient.getQueryData<ConvsInfinite>(
        queryKeys.conversations(),
      );
      let items = cached?.pages.flatMap((p) => p.items) ?? [];

      if (items.length === 0) {
        const local = (await readLocalConversations(userId)) ?? [];
        items = local as unknown as ConvItem[];
        if (items.length > 0) {
          queryClient.setQueryData<ConvsInfinite>(queryKeys.conversations(), {
            pages: [
              {
                items,
                total: items.length,
                page: 1,
                pageSize: PAGE_SIZE,
              },
            ],
            pageParams: [1],
          });
        }
      }

      return {
        threads: items.map((item) => ({
          remoteId: item.id,
          status: "regular" as const,
          title: item.title ?? undefined,
        })),
      };
    },

    async initialize(_id) {
      let model = getChatModel();
      if (!model) {
        const pricing = queryClient.getQueryData<{
          firstFreeModel?: { name: string } | null;
        }>(queryKeys.pricing());
        model = pricing?.firstFreeModel?.name ?? null;
      }
      if (!model) throw new Error(t("ERRORS.NO_TEXT_MODELS"));
      let id = getConvId();
      if (!id) {
        id = uid();
        setConvId(id);
      }

      const now = dayjs().toDate();
      const newItem: ConvItem = {
        id,
        title: null,
        model,
        totalCost: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        createdAt: now,
        updatedAt: now,
      } as ConvItem;

      await upsertLocalConversation(userId, {
        id,
        title: null,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCost: 0,
        syncExpiresAt: null,
        createdAt: now,
        updatedAt: now,
      });

      // Seed conversation_settings from current jotai defaults so the first
      // turn already runs with the user's preferred sampling/effort/web
      // search knobs. Drawer mutates the row directly afterward.
      const defaults = getChatDefaults();
      await upsertLocalConversationSettings(userId, {
        convId: id,
        defaultModel: model,
        personaId: null,
        presetId: null,
        systemPromptOverride: null,
        authorNote: null,
        authorNoteDepth: 4,
        chatMemory: 8,
        reasoningEffort: defaults.reasoningEffort ?? null,
        webSearchEnabled: defaults.webSearchEnabled ?? false,
        webSearchEngine: defaults.webSearchEngine ?? "auto",
        webSearchContextSize: defaults.webSearchContextSize ?? "medium",
        temperature: defaults.temperature ?? null,
        topP: defaults.topP ?? null,
        topK: defaults.topK ?? null,
        minP: defaults.minP ?? null,
        topA: defaults.topA ?? null,
        frequencyPenalty: defaults.frequencyPenalty ?? null,
        presencePenalty: defaults.presencePenalty ?? null,
        repetitionPenalty: defaults.repetitionPenalty ?? null,
        maxTokens: defaults.maxTokens ?? null,
        extraBody: defaults.extraBody ?? null,
        streamingEnabled: defaults.streamingEnabled ?? true,
        updatedAt: now,
      });

      queryClient.setQueryData<ConvsInfinite>(
        queryKeys.conversations(),
        (old) => prependConv(old, newItem),
      );
      return { remoteId: id, externalId: undefined };
    },

    async rename(id, title) {
      const existing = await readLocalConversation(userId, id);
      const now = dayjs().toDate();
      await upsertLocalConversation(userId, {
        ...(existing ?? {}),
        id,
        title,
        updatedAt: now,
      });
      if (userId > GUEST_USER_ID && existing?.syncExpiresAt != null) {
        try {
          handleElysia(
            await rpc.api.ai
              .sync({ kind: "conversations" })({ id })
              .post({
                payload: {
                  conversation: { ...existing, title, updatedAt: now },
                },
                keepExpiry: true,
              }),
          );
        } catch (err) {
          await enqueuePending(userId, "conversations", id, "patch", err);
        }
      }
      queryClient.setQueryData<ConvsInfinite>(
        queryKeys.conversations(),
        (old) => patchConv(old, id, { title }),
      );
    },

    async archive(_id) {},
    async unarchive(_id) {},

    async delete(id) {
      const existing = await readLocalConversation(userId, id);
      const wasSynced = existing?.syncExpiresAt != null;
      await deleteLocalConversation(userId, id);
      if (userId > GUEST_USER_ID && wasSynced) {
        try {
          handleElysia(
            await rpc.api.ai.sync({ kind: "conversations" })({ id }).delete(),
          );
        } catch (err) {
          await enqueuePending(userId, "conversations", id, "delete", err);
        }
      }
      queryClient.setQueryData<ConvsInfinite>(
        queryKeys.conversations(),
        (old) => removeConv(old, id),
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.syncState() });
    },

    async fetch(id) {
      const cached = queryClient
        .getQueryData<ConvsInfinite>(queryKeys.conversations())
        ?.pages.flatMap((p) => p.items)
        .find((i) => i.id === id);

      if (cached) {
        return {
          remoteId: cached.id,
          status: "regular" as const,
          title: cached.title ?? undefined,
        };
      }

      const local = await readLocalConversation(userId, id);
      if (local) {
        return {
          remoteId: local.id,
          status: "regular" as const,
          title: local.title ?? undefined,
        };
      }

      handleError(new Error("chat-not-found"), t, "chat-not-found");
      return {
        remoteId: id,
        status: "regular" as const,
        title: undefined,
      };
    },

    async generateTitle(id, messages) {
      return createAssistantStream(async (controller) => {
        const text = extractFirstUserText(messages);
        if (!text) {
          controller.appendText(t("CHAT.NEW_CONVERSATION"));
          return;
        }

        const model = getChatModel() ?? undefined;
        const res = await rpc.api.ai.chat.title.post({ text, model });
        const data = handleElysia(res);
        controller.appendText(data.title);

        const now = dayjs().toDate();
        const existing = await readLocalConversation(userId, id);
        await upsertLocalConversation(userId, {
          ...(existing ?? {}),
          id,
          title: data.title,
          updatedAt: now,
        });
        if (userId > GUEST_USER_ID && existing?.syncExpiresAt != null) {
          try {
            handleElysia(
              await rpc.api.ai
                .sync({ kind: "conversations" })({ id })
                .post({
                  payload: {
                    conversation: {
                      ...existing,
                      title: data.title,
                      updatedAt: now,
                    },
                  },
                  keepExpiry: true,
                }),
            );
          } catch (err) {
            await enqueuePending(userId, "conversations", id, "patch", err);
          }
        }

        queryClient.setQueryData<ConvsInfinite>(
          queryKeys.conversations(),
          (old) => patchConv(old, id, { title: data.title }),
        );
      });
    },
  };
}
