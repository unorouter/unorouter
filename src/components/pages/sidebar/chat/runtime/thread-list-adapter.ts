import {
  mirrorConvRowIfSynced,
  unmirrorIfSynced,
} from "@/hooks/ai/rp/shared";
import { GUEST_USER_ID } from "@/lib/config/constants";
import {
  deleteLocalConversation,
  readLocalConversation,
  readLocalConversations,
  replaceLocalConversationBindings,
  upsertLocalConversation,
} from "@/lib/db/client/data/chat";
import type { buildPricingSummary } from "@/lib/api/pricing";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { handleError } from "@/lib/utils/client";
import {
  chatDefaultsAtom,
  chatLoadoutAtom,
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

// Pure local-first. Network only: sync mirror + title gen.

export function createThreadListAdapter(
  queryClient: QueryClient,
  t: ReturnType<typeof useTranslations<never>>,
  getUserId: () => number,
): RemoteThreadListAdapter {
  const userId = (): number => getUserId();
  // Shared by rename + generateTitle: local write, mirror patch when synced,
  // invalidate the list + meta queries.
  const persistTitle = async (id: string, title: string) => {
    const now = dayjs().toDate();
    const existing = await readLocalConversation(userId(), id);
    await upsertLocalConversation(userId(), {
      ...(existing ?? {}),
      id,
      title,
      updatedAt: now,
    });
    await mirrorConvRowIfSynced(userId(), id);
    queryClient.invalidateQueries({ queryKey: queryKeys.conversations() });
    queryClient.invalidateQueries({ queryKey: queryKeys.chatMeta(id) });
  };
  return {
    async list() {
      const items = (await readLocalConversations(userId())) ?? [];
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

      // Settings cols live on the conversation row; write both in one upsert
      // so the NOT NULL default_model is satisfied on insert.
      const defaults = chatStore.get(chatDefaultsAtom);
      // Sticky loadout: auto-equip new chats with the user's chosen
      // preset/persona/characters/lorebooks so they don't re-bind each time.
      const loadout = chatStore.get(chatLoadoutAtom);
      await upsertLocalConversation(userId(), {
        id,
        title: null,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCost: 0,
        syncExpiresAt: null,
        createdAt: now,
        updatedAt: now,
        defaultModel: model,
        personaId: loadout.personaId ?? null,
        presetId: loadout.presetId ?? null,
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
      });

      // Character + lorebook bindings live in join tables, written after the
      // conversation row exists so the FK resolves.
      if (loadout.characterIds.length > 0 || loadout.lorebookIds.length > 0) {
        await replaceLocalConversationBindings(userId(), id, {
          conversationCharacters: loadout.characterIds.map((cid, i) => ({
            characterId: cid,
            orderIndex: i,
          })),
          conversationLorebooks: loadout.lorebookIds.map((lid, i) => ({
            lorebookId: lid,
            orderIndex: i,
          })),
        });
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.conversations() });
      return { remoteId: id, externalId: undefined };
    },

    async rename(id, title) {
      await persistTitle(id, title);
    },

    async archive(_id) {},
    async unarchive(_id) {},

    async delete(id) {
      const existing = await readLocalConversation(userId(), id);
      const wasSynced = existing?.syncExpiresAt != null;
      await deleteLocalConversation(userId(), id);
      await unmirrorIfSynced(userId(), "conversations", id, wasSynced);
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations() });
      queryClient.invalidateQueries({ queryKey: queryKeys.syncState() });
    },

    async fetch(id) {
      const local = await readLocalConversation(userId(), id);
      if (local) {
        return {
          remoteId: local.id,
          status: "regular",
          title: local.title ?? undefined,
        };
      }

      if (userId() > GUEST_USER_ID) {
        try {
          const res = handleElysia(
            await rpc.api.ai
              .sync({ kind: "conversations" })({ id })
              .bundle.get(),
          ) as { conversation?: { title?: string | null } } | undefined;
          if (res?.conversation) {
            return {
              remoteId: id,
              status: "regular",
              title: res.conversation.title ?? undefined,
            };
          }
        } catch {}
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

        await persistTitle(id, data.title);
      });
    },
  };
}
