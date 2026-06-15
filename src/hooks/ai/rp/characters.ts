"use client";

import { useLocalUserId } from "@/hooks/auth/use-local-user-id";
import { upsertLocalMedia } from "@/lib/db/client/data/media";
import {
  deleteLocalCharacter,
  readLocalCharacter,
  readLocalCharacters,
  upsertLocalCharacter,
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

    // Client-side card parser: bytes become a media row plus a character row referencing it.
export function useImportCharacterCardMutation() {
  const userId = useLocalUserId();
  return useApiMutation({
    mutationFn: async (file: File) => {
          // Dynamic: character-foundry + image codecs (~110KB gzip) load on the import action, not with the chat shell.
      const { card, imageBytes, imageMime } =
        await import("@/lib/ai/rp/character-card").then((m) =>
          m.parseCharacterCardFile(file),
        );
      const id = uid();
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
      const now = dayjs().toDate();
      const row = {
        id,
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
      };
      await upsertLocalCharacter(userId, row);
      return row;
    },
    invalidates: [queryKeys.characters()],
  });
}
