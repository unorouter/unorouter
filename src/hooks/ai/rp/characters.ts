"use client";

import { useLocalUserId } from "@/hooks/auth/use-local-user-id";
import { upsertLocalMedia } from "@/lib/db/client/data/media";
import {
  deleteLocalCharacter,
  readLocalCharacter,
  readLocalCharacters,
  upsertLocalCardBundle,
  upsertLocalCharacter,
  upsertLocalLorebookBundle,
} from "@/lib/db/client/data/rp";
import { queryKeys } from "@/lib/react-query/keys";
import { uid, uint8ToBase64 } from "@/lib/utils/base";
import { useApiMutation } from "@/lib/react-query/hooks";
import { dayjs } from "@/lib/utils/format/date";
import { makeRpEntity } from "./factory";
import type { CharacterRow } from "@/lib/db/schema/rows";

const characters = makeRpEntity<
  CharacterRow,
  Record<string, unknown>,
  Record<string, unknown>
>({
  listKey: queryKeys.characters,
  itemKey: queryKeys.character,
  readList: readLocalCharacters,
  readItem: readLocalCharacter,
  upsertLocal: upsertLocalCharacter,
  deleteLocal: deleteLocalCharacter,
});

export const useCharactersQuery = characters.useList;
export const useCharacterQuery = characters.useItem;
export const useCreateCharacterMutation = characters.useCreate;
export const useUpdateCharacterMutation = characters.useUpdate;
export const useDeleteCharacterMutation = characters.useDelete;

// Full import: a card file becomes a character (+ avatar), its embedded lorebook
// (if any), AND a Card binding them, so the user opens the Card and chats with
// everything equipped. Shared by file import and JanitorAI link import.
async function persistCharacterSetupFromFile(
  userId: number | undefined,
  file: File,
) {
  // Dynamic: character-foundry + image codecs (~110KB gzip) load on the import action, not with the chat shell.
  const { card, imageBytes, imageMime } = await import(
    "@/lib/ai/rp/character-card"
  ).then((m) => m.parseCharacterCardFile(file));

  const now = dayjs().toDate();
  const characterId = uid();

  let avatarMediaId: string | null = null;
  if (imageBytes && imageMime) {
    avatarMediaId = uid();
    await upsertLocalMedia(userId, {
      id: avatarMediaId,
      convId: null,
      mimeType: imageMime,
      sizeBytes: imageBytes.byteLength,
      dataBase64: uint8ToBase64(imageBytes),
    });
  }

  await upsertLocalCharacter(userId, {
    id: characterId,
    userId,
    name: card.name,
    avatarMediaId,
    description: card.description ?? null,
    personality: card.personality ?? null,
    scenario: card.scenario ?? null,
    firstMessage: card.firstMessage ?? null,
    alternateGreetings: card.alternateGreetings ?? null,
    exampleMessages: card.exampleMessages ?? null,
    systemPrompt: card.systemPrompt ?? null,
    postHistoryInstructions: card.postHistoryInstructions ?? null,
    defaultReasoningEffort: null,
    tags: card.tags ?? null,
    triggers: null,
    alwaysActive: true,
    matchWholeWords: false,
    syncExpiresAt: null,
    createdAt: now,
    updatedAt: now,
  });

  // Embedded lorebook (CCv3 character_book). Best-effort: a bad book must not
  // abort the character import, so wrap it and degrade to character-only.
  let lorebookId: string | null = null;
  try {
    const characterBook = (
      card.raw as { data?: { character_book?: unknown } } | undefined
    )?.data?.character_book;
    if (characterBook) {
      const parsed = await import("@/lib/ai/rp/lorebook-import").then((m) =>
        m.parseLorebookJson(characterBook),
      );
      if (parsed && parsed.entries.length > 0) {
        lorebookId = uid();
        await upsertLocalLorebookBundle(userId, {
          lorebook: {
            id: lorebookId,
            userId,
            name: parsed.name,
            description: parsed.description ?? null,
            scanDepth: parsed.scanDepth ?? 4,
            tokenBudget: parsed.tokenBudget ?? 1500,
            recursiveScanning: parsed.recursiveScanning ?? false,
            syncExpiresAt: null,
            createdAt: now,
            updatedAt: now,
          } as never,
          entries: parsed.entries.map((e, i) => ({
            id: uid(),
            lorebookId,
            keys: e.keys,
            secondaryKeys: e.secondaryKeys ?? null,
            content: e.content,
            constant: e.constant,
            selective: e.selective,
            priority: e.priority,
            enabled: e.enabled,
            orderIndex: e.orderIndex ?? i,
            matchWholeWords: false,
            injectionRole: "system" as const,
            createdAt: now,
            updatedAt: now,
          })) as never,
        });
      }
    }
  } catch {
    lorebookId = null;
  }

  // Card binds the character (+ lorebook) so it is one-click usable.
  const cardId = uid();
  await upsertLocalCardBundle(userId, {
    card: {
      id: cardId,
      userId,
      name: card.name,
      description: card.description ?? null,
      personaId: null,
      syncExpiresAt: null,
      createdAt: now,
      updatedAt: now,
    } as never,
    cardCharacters: [{ cardId, characterId, orderIndex: 0 }],
    cardLorebooks: lorebookId ? [{ cardId, lorebookId, orderIndex: 0 }] : [],
  });

  return { characterId, lorebookId, cardId };
}

const IMPORT_INVALIDATES = [
  queryKeys.characters(),
  queryKeys.lorebooks(),
  queryKeys.cards(),
];

export function useImportCharacterCardMutation() {
  const userId = useLocalUserId();
  return useApiMutation({
    mutationFn: (file: File) => persistCharacterSetupFromFile(userId, file),
    invalidates: IMPORT_INVALIDATES,
  });
}

// Paste a JanitorAI/JannyAI link -> fetch the card -> full import (local-first).
export function useImportCharacterFromUrlMutation() {
  const userId = useLocalUserId();
  return useApiMutation({
    mutationFn: async (input: string) => {
      const file = await import("@/lib/ai/rp/janitor-import").then((m) =>
        m.fetchJanitorCharacterFile(input),
      );
      return persistCharacterSetupFromFile(userId, file);
    },
    invalidates: IMPORT_INVALIDATES,
  });
}
