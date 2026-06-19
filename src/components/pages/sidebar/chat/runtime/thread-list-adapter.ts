import {
  deleteLocalConversation,
  readLocalConversation,
  readLocalConversations,
  replaceLocalConversationBindings,
  updateLocalConversationSettings,
  upsertLocalConversation,
  upsertLocalMessage,
  upsertLocalMessageItem,
} from "@/lib/db/client/data/chat";
import {
  readLocalCharacter,
  readLocalPersona,
  readLocalPreset,
} from "@/lib/db/client/data/rp";
import { expandMacros } from "@/lib/ai/chat/macros";
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

// Pure local-first. Network only: title gen.

export function createThreadListAdapter(
  queryClient: QueryClient,
  t: ReturnType<typeof useTranslations<never>>,
  getUserId: () => number,
): RemoteThreadListAdapter {
  const userId = (): number => getUserId();
  // Shared by rename + generateTitle: local write, invalidate list + meta.
  const persistTitle = async (id: string, title: string) => {
    const now = dayjs().toDate();
    const existing = await readLocalConversation(userId(), id);
    // Title patch on an existing row; never upsert (a candidate insert nulls default_model and trips NOT NULL).
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
      // A new chat must get a FRESH id, never inherit a stale convIdAtom (the merge bug).
      const id = freshConvId();

      const now = dayjs().toDate();

      // Settings cols live on the conversation row; write both in one upsert so NOT NULL default_model holds.
      const defaults = chatStore.get(chatDefaultsAtom);
      // Sticky loadout: auto-equip new chats with the user's chosen preset/persona/characters/lorebooks.
      const loadout = chatStore.get(chatLoadoutAtom);
      // Seed settings from the bound preset so the drawer shows what the stream uses. Per field: preset value, else app default.
      const preset = loadout.presetId
        ? await readLocalPreset(userId(), loadout.presetId)
        : null;
      const seed = <K extends keyof typeof defaults>(
        key: K,
        presetValue: number | boolean | string | null | undefined,
      ) => presetValue ?? defaults[key] ?? null;
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
        chatMemory: preset?.chatMemory ?? defaults.chatMemory ?? null,
        reasoningEffort: defaults.reasoningEffort ?? null,
        webSearchEnabled: defaults.webSearchEnabled ?? false,
        webSearchEngine: defaults.webSearchEngine ?? "auto",
        webSearchContextSize: defaults.webSearchContextSize ?? "medium",
        temperature: seed("temperature", preset?.temperature),
        topP: seed("topP", preset?.topP),
        topK: seed("topK", preset?.topK),
        minP: seed("minP", preset?.minP),
        topA: seed("topA", preset?.topA),
        frequencyPenalty: seed("frequencyPenalty", preset?.frequencyPenalty),
        presencePenalty: seed("presencePenalty", preset?.presencePenalty),
        repetitionPenalty: seed("repetitionPenalty", preset?.repetitionPenalty),
        maxTokens: seed("maxTokens", preset?.maxTokens),
        extraBody: preset?.extraBody ?? defaults.extraBody ?? null,
        // null = inherit; the stream resolver falls back conv -> preset -> true.
        streamingEnabled:
          preset?.streamingEnabled ?? defaults.streamingEnabled ?? null,
        showReasoning: preset?.showReasoning ?? defaults.showReasoning ?? null,
        group: chatStore.get(chatGroupAtom),
      });

      // Character + lorebook bindings live in join tables, written after the conversation row exists for the FK.
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

      // Risu greeting parity: firstMessage + alternates seed as root branch siblings, preview-picked one active.
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
            // Patch-only on the row seeded above; omitting default_model in an upsert would trip NOT NULL.
            await updateLocalConversationSettings(userId(), {
              convId: id,
              firstMsgIndex: picked - 1,
              updatedAt: now,
            });
          }
          chatStore.set(greetingIndexAtom, 0);
          // Surface the picked greeting in live thread state; prepend keeps the in-flight user turn intact.
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

        const model = chatStore.get(chatModelAtom) ?? undefined;
        const res = await rpc.api.ai.chat.title.post({ text, model });
        const data = handleElysia(res);
        controller.appendText(data.title);

        await persistTitle(id, data.title);
      });
    },
  };
}
