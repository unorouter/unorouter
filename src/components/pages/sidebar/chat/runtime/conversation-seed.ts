"use client";

import {
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
import { DEFAULT_AUTHOR_NOTE_DEPTH } from "@/lib/config/constants";
import { logChatDebug } from "@/lib/utils/chat-debug-log";
import { recArr, uid } from "@/lib/utils/base";
import type { ChatUIMessage } from "@/lib/types";
import type { PricingCatalogData } from "@/openapi";
import { queryKeys } from "@/lib/react-query/keys";
import {
  CHAT_STORE_KEY,
  chatDefaultsAtom,
  chatGroupAtom,
  chatLoadoutAtom,
  chatModelAtom,
  chatStore,
  setLiveMessages,
  greetingIndexAtom,
  INITIAL_CHAT_STATE,
} from "@/store/chat-store";
import { jotaiCookieStorage } from "@/lib/config/table-storage";
import type { QueryClient } from "@tanstack/react-query";
import { dayjs } from "@/lib/utils/format/date";

type SeedArgs = {
  convId: string;
  queryClient: QueryClient;
  /** Pre-translated: this module runs outside React. */
  noModelsError: string;
};

// Idempotency key for the send-wrapper vs initialize race assistant-ui runs unordered.
// Creation MUST stay awaited-before-send or a fast first send assembles without the greeting.
const seeding = new Map<string, Promise<void>>();

export function seedConversation(args: SeedArgs): Promise<void> {
  const existing = seeding.get(args.convId);
  if (existing) return existing;
  const work = seed(args);
  seeding.set(args.convId, work);
  work.catch(() => seeding.delete(args.convId));
  return work;
}

async function seed(args: SeedArgs): Promise<void> {
  const id = args.convId;
  const queryClient = args.queryClient;

  let model = chatStore.get(chatModelAtom);
  if (!model) {
    const pricing = queryClient.getQueryData<PricingCatalogData>(
      queryKeys.pricingCatalog(),
    );
    model = pricing?.first_free_model ?? null;
  }
  if (!model) throw new Error(args.noModelsError);

  const now = dayjs().toDate();

  // Cookie directly, not just the atom: the atom hydrates after mount, so a new chat
  // created in that window seeds null over the user's defaults.
  const cookieState = jotaiCookieStorage.getItem(
    CHAT_STORE_KEY,
    INITIAL_CHAT_STATE,
  );
  const atomDefaults = chatStore.get(chatDefaultsAtom);
  const defaults = {
    ...(cookieState.defaults ?? {}),
    ...atomDefaults,
  };
  const loadout = chatStore.get(chatLoadoutAtom);
  const hasPreset = !!loadout.presetId;
  const seedField = <K extends keyof typeof defaults>(key: K) =>
    hasPreset ? null : (defaults[key] ?? null);
  const boundPreset = loadout.presetId
    ? await readLocalPreset(loadout.presetId)
    : null;
  const seedMaxTokens =
    boundPreset?.maxTokens != null ? null : (defaults.maxTokens ?? null);
  await upsertLocalConversation({
    id,
    title: null,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0,
    createdAt: now,
    updatedAt: now,
    defaultModel: model,
    personaId: loadout.personaId ?? null,
    presetId: loadout.presetId ?? null,
    systemPromptOverride: null,
    authorNote: null,
    authorNoteDepth: DEFAULT_AUTHOR_NOTE_DEPTH,
    chatMemory: hasPreset ? null : (defaults.chatMemory ?? null),
    reasoningEffort: defaults.reasoningEffort ?? null,
    webSearchEnabled: defaults.webSearchEnabled ?? false,
    webSearchEngine: defaults.webSearchEngine ?? "auto",
    webSearchContextSize: defaults.webSearchContextSize ?? "medium",
    temperature: seedField("temperature"),
    topP: seedField("topP"),
    topK: seedField("topK"),
    minP: seedField("minP"),
    topA: seedField("topA"),
    frequencyPenalty: seedField("frequencyPenalty"),
    presencePenalty: seedField("presencePenalty"),
    repetitionPenalty: seedField("repetitionPenalty"),
    maxTokens: seedMaxTokens,
    extraBody: hasPreset ? null : (defaults.extraBody ?? null),
    streamingEnabled: hasPreset ? null : (defaults.streamingEnabled ?? null),
    autoScrollStream:
      boundPreset?.autoScrollStream ?? defaults.autoScrollStream ?? null,
    showReasoning: hasPreset ? null : (defaults.showReasoning ?? null),
    group: chatStore.get(chatGroupAtom),
  });

  logChatDebug("conv.initialized", {
    convId: id,
    model,
    presetId: loadout.presetId ?? null,
    boundPresetFound: !!boundPreset,
    personaId: loadout.personaId ?? null,
    characterCount: loadout.characterIds.length,
    lorebookCount: loadout.lorebookIds.length,
    temperature: seedField("temperature"),
    maxTokens: seedMaxTokens,
    chatMemory: hasPreset ? null : (defaults.chatMemory ?? null),
    defaultsPresent: Object.entries(defaults)
      .filter(([, v]) => v != null)
      .map(([k]) => k),
  });

  if (loadout.characterIds.length > 0 || loadout.lorebookIds.length > 0) {
    await replaceLocalConversationBindings(id, {
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
    const char = await readLocalCharacter(loadout.characterIds[0]);
    if (char?.firstMessage) {
      const persona = loadout.personaId
        ? await readLocalPersona(loadout.personaId)
        : null;
      const greetings = [char.firstMessage, ...(char.alternateGreetings ?? [])];
      const picked = Math.min(
        chatStore.get(greetingIndexAtom),
        greetings.length - 1,
      );
      let seededGreeting: { id: string; text: string } | null = null;
      for (let i = 0; i < greetings.length; i++) {
        const msgId = uid();
        await upsertLocalMessage({
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
        await upsertLocalMessageItem({
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
        await updateLocalConversationSettings({
          convId: id,
          firstMsgIndex: picked - 1,
          updatedAt: now,
        });
      }
      chatStore.set(greetingIndexAtom, 0);
      if (seededGreeting) {
        const greetingMessage: ChatUIMessage = {
          id: seededGreeting.id,
          role: "assistant",
          parts: [{ type: "text", text: seededGreeting.text }],
        };
        setLiveMessages(
          (msgs) =>
            recArr(msgs).some((m) => m.id === seededGreeting.id)
              ? msgs
              : [greetingMessage, ...msgs],
          id,
        );
      }
      queryClient.invalidateQueries({
        queryKey: queryKeys.chatMessages(id),
      });
    }
  }

  queryClient.invalidateQueries({ queryKey: queryKeys.conversations() });
}
