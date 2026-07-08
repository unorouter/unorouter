import {
  deleteLocalConversation,
  readLocalConversation,
  readLocalConversations,
  replaceLocalConversationBindings,
  updateLocalConversationSettings,
  upsertLocalConversation,
  upsertLocalMessage,
  upsertLocalMessageItem,
} from "@/lib/db/client/data/chat/chat";
import {
  readLocalCharacter,
  readLocalPersona,
  readLocalPreset,
} from "@/lib/db/client/data/rp/rp";
import { expandMacros } from "@/lib/ai/chat/macros";
import { isCustomModelId } from "@/lib/ai/chat/custom-provider-id";
import { uid } from "@/lib/utils/base";
import type { buildPricingSummary } from "@/lib/api/pricing";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { handleError } from "@/lib/utils/client";
import {
  chatDefaultsAtom,
  chatGroupAtom,
  chatHelpersAtom,
  chatLoadoutAtom,
  chatModelAtom,
  chatStore,
  freshConvId,
  greetingIndexAtom,
} from "@/store/chat-store";
import type { RemoteThreadListAdapter } from "@assistant-ui/react";
import type { QueryClient } from "@tanstack/react-query";
import { createAssistantStream } from "assistant-stream";
import { dayjs } from "@/lib/utils/format/date";
import type { useTranslations } from "next-intl";
import { extractFirstUserText } from "./chat-utils";

export function createThreadListAdapter(
  queryClient: QueryClient,
  t: ReturnType<typeof useTranslations<never>>,
  getUserId: () => number,
): RemoteThreadListAdapter {
  const userId = (): number => getUserId();
  const persistTitle = async (id: string, title: string) => {
    const now = dayjs().toDate();
    const existing = await readLocalConversation(userId(), id);
    if (!existing) return;
    await updateLocalConversationSettings(userId(), {
      convId: id,
      title,
      updatedAt: now,
    });
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
      const id = freshConvId();

      const now = dayjs().toDate();

      const defaults = chatStore.get(chatDefaultsAtom);
      const loadout = chatStore.get(chatLoadoutAtom);
      const hasPreset = !!loadout.presetId;
      const seed = <K extends keyof typeof defaults>(key: K) =>
        hasPreset ? null : (defaults[key] ?? null);
      // Max tokens is the user's reply-length control and must stay sticky across new chats. A bound preset
      // that doesn't set its own maxTokens should NOT wipe the last-used default to null (which sends no cap
      // and lets the provider apply a small one). Seed it from defaults unless the preset supplies its own.
      const boundPreset = loadout.presetId
        ? await readLocalPreset(userId(), loadout.presetId)
        : null;
      const seedMaxTokens =
        boundPreset?.maxTokens != null ? null : (defaults.maxTokens ?? null);
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
        chatMemory: hasPreset ? null : (defaults.chatMemory ?? null),
        reasoningEffort: defaults.reasoningEffort ?? null,
        webSearchEnabled: defaults.webSearchEnabled ?? false,
        webSearchEngine: defaults.webSearchEngine ?? "auto",
        webSearchContextSize: defaults.webSearchContextSize ?? "medium",
        temperature: seed("temperature"),
        topP: seed("topP"),
        topK: seed("topK"),
        minP: seed("minP"),
        topA: seed("topA"),
        frequencyPenalty: seed("frequencyPenalty"),
        presencePenalty: seed("presencePenalty"),
        repetitionPenalty: seed("repetitionPenalty"),
        maxTokens: seedMaxTokens,
        extraBody: hasPreset ? null : (defaults.extraBody ?? null),
        streamingEnabled: hasPreset
          ? null
          : (defaults.streamingEnabled ?? null),
        showReasoning: hasPreset ? null : (defaults.showReasoning ?? null),
        group: chatStore.get(chatGroupAtom),
      });

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

      if (loadout.characterIds.length > 0) {
        const char = await readLocalCharacter(
          userId(),
          loadout.characterIds[0],
        );
        if (char?.firstMessage) {
          const persona = loadout.personaId
            ? await readLocalPersona(userId(), loadout.personaId)
            : null;
          const greetings = [
            char.firstMessage,
            ...(char.alternateGreetings ?? []),
          ];
          const picked = Math.min(
            chatStore.get(greetingIndexAtom),
            greetings.length - 1,
          );
          let seededGreeting: { id: string; text: string } | null = null;
          for (let i = 0; i < greetings.length; i++) {
            const msgId = uid();
            await upsertLocalMessage(userId(), {
              id: msgId,
              convId: id,
              parentId: null,
              characterId: char.id,
              role: "assistant",
              model: null,
              branchIndex: i,
              isActiveBranch: i === picked,
              isEdited: false,
              createdAt: now,
              updatedAt: now,
            });
            const expandedGreeting = expandMacros(greetings[i], {
              user: persona?.name ?? "User",
              char: char.name,
              user_description: persona?.description ?? "",
              char_description: char.description ?? "",
              scenario: char.scenario ?? "",
              personality: char.personality ?? "",
              vars: {},
            });
            await upsertLocalMessageItem(userId(), {
              id: uid(),
              messageId: msgId,
              sequenceIndex: 0,
              type: "text",
              data: { text: expandedGreeting },
            });
            if (i === picked) {
              seededGreeting = { id: msgId, text: expandedGreeting };
            }
          }
          if (picked > 0) {
            await updateLocalConversationSettings(userId(), {
              convId: id,
              firstMsgIndex: picked - 1,
              updatedAt: now,
            });
          }
          chatStore.set(greetingIndexAtom, 0);
          const helpers = chatStore.get(chatHelpersAtom);
          if (helpers && seededGreeting) {
            const greetingMessage = {
              id: seededGreeting.id,
              role: "assistant",
              parts: [{ type: "text", text: seededGreeting.text }],
            };
            helpers.setMessages((msgs) =>
              msgs.some((m) => (m as { id?: string }).id === seededGreeting.id)
                ? msgs
                : [greetingMessage, ...msgs],
            );
          }
          queryClient.invalidateQueries({
            queryKey: queryKeys.chatMessages(id),
          });
        }
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
      await deleteLocalConversation(userId(), id);
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations() });
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

        const selected = chatStore.get(chatModelAtom);
        const model =
          selected && !isCustomModelId(selected) ? selected : undefined;
        const res = await rpc.api.ai.chat.title.post({ text, model });
        const data = handleElysia(res);
        controller.appendText(data.title);

        await persistTitle(id, data.title);
      });
    },
  };
}
