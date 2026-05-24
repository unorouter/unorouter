import { mirrorConvPatchIfSynced, unmirrorIfSynced } from "@/hooks/ai/rp/shared";
import { GUEST_USER_ID } from "@/lib/config/constants";
import {
  deleteLocalConversation,
  readLocalConversation,
  readLocalConversations,
  upsertLocalConversation,
  upsertLocalConversationSettings,
} from "@/lib/db/client/data/chat";
import type { buildPricingSummary } from "@/lib/api/pricing";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { handleError } from "@/lib/utils/client";
import {
  chatDefaultsAtom,
  chatModelAtom,
  chatStore,
  ensureConvId,
} from "@/store/chat-store";
import type { RemoteThreadListAdapter } from "@assistant-ui/react";
import type { QueryClient } from "@tanstack/react-query";
import { createAssistantStream } from "assistant-stream";
import { dayjs } from "@/lib/utils/format/date";
import type { useTranslations } from "next-intl";
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
      const items = (await readLocalConversations(userId)) ?? [];
      return {
        threads: items.map((item) => ({
          remoteId: item.id,
          status: "regular",
          title: item.title ?? undefined,
        })),
      };
    },

    async initialize(_id) {
      let model = chatStore.get(chatModelAtom);
      if (!model) {
        const pricing = queryClient.getQueryData<
          ReturnType<typeof buildPricingSummary>
        >(queryKeys.pricing());
        model = pricing?.firstFreeModel?.name ?? null;
      }
      if (!model) throw new Error(t("ERRORS.NO_TEXT_MODELS"));
      const id = ensureConvId();

      const now = dayjs().toDate();

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
      const defaults = chatStore.get(chatDefaultsAtom);
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

      queryClient.invalidateQueries({ queryKey: queryKeys.conversations() });
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
        await mirrorConvPatchIfSynced(userId, id, {
          conversation: { ...existing, title, updatedAt: now },
        });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations() });
      queryClient.invalidateQueries({ queryKey: queryKeys.chatMeta(id) });
    },

    async archive(_id) {},
    async unarchive(_id) {},

    async delete(id) {
      const existing = await readLocalConversation(userId, id);
      const wasSynced = existing?.syncExpiresAt != null;
      await deleteLocalConversation(userId, id);
      await unmirrorIfSynced(userId, "conversations", id, wasSynced);
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations() });
      queryClient.invalidateQueries({ queryKey: queryKeys.syncState() });
    },

    async fetch(id) {
      const local = await readLocalConversation(userId, id);
      if (local) {
        return {
          remoteId: local.id,
          status: "regular",
          title: local.title ?? undefined,
        };
      }

      handleError(new Error("chat-not-found"), t, "chat-not-found");
      return {
        remoteId: id,
        status: "regular",
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

        const model = chatStore.get(chatModelAtom) ?? undefined;
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
          await mirrorConvPatchIfSynced(userId, id, {
            conversation: { ...existing, title: data.title, updatedAt: now },
          });
        }

        queryClient.invalidateQueries({ queryKey: queryKeys.conversations() });
        queryClient.invalidateQueries({ queryKey: queryKeys.chatMeta(id) });
      });
    },
  };
}
