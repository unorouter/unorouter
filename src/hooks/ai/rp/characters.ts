"use client";

import { GUEST_USER_ID } from "@/lib/config/constants";

import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { upsertLocalMedia } from "@/lib/db/client/data/media";
import {
  deleteLocalCharacter,
  readLocalCharacter,
  readLocalCharacters,
  upsertLocalCharacter,
} from "@/lib/db/client/data/rp";
import { parseCharacterCardFile } from "@/lib/playground/rp/character-card";
import { listAdd } from "@/lib/react-query/cache-helpers";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { uid, uint8ToBase64 } from "@/lib/utils/base";
import { handleError } from "@/lib/utils/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { makeRpEntity } from "./factory";
import type { EntityListResponse } from "./shared";

type CharactersList = EntityListResponse<typeof rpc.api.ai.rp.characters.get>;
export type Character =
  CharactersList extends ReadonlyArray<infer Item> ? Item : never;

const characters = makeRpEntity<
  Character,
  Record<string, unknown>,
  Record<string, unknown>
>({
  syncKind: "characters",
  listKey: queryKeys.characters,
  itemKey: queryKeys.character,
  readList: (userId) =>
    readLocalCharacters(userId) as Promise<Character[] | null>,
  readItem: (userId, id) =>
    readLocalCharacter(userId, id) as Promise<Character | null>,
  upsertLocal: (userId, row) => upsertLocalCharacter(userId, row as never),
  deleteLocal: (userId, id) => deleteLocalCharacter(userId, id),
});

export const useCharactersQuery = characters.useList;
export const useCreateCharacterMutation = characters.useCreate;
export const useUpdateCharacterMutation = characters.useUpdate;
export const useDeleteCharacterMutation = characters.useDelete;

// Client-side card parser: bytes -> media row + character row referencing it.
// Sync flow: media base64 -> server uploads to R2 -> Turso pointer-only.
export function useImportCharacterCardMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (file: File) => {
      const userId = auth.data?.id ?? GUEST_USER_ID;
      const { card, imageBytes, imageMime } =
        await parseCharacterCardFile(file);
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
        exampleMessages: card.exampleMessages ?? null,
        systemPrompt: card.systemPrompt ?? null,
        postHistoryInstructions: card.postHistoryInstructions ?? null,
        defaultReasoningEffort: null,
        tags: card.tags ?? null,
        nsfw: false,
        triggers: null,
        alwaysActive: true,
        matchWholeWords: false,
        syncExpiresAt: null,
        createdAt: now,
        updatedAt: now,
      };
      await upsertLocalCharacter(userId, row as never);
      return row as unknown as Character;
    },
    onSuccess: (row) => {
      qc.setQueryData<Character[]>(queryKeys.characters(), (old) =>
        listAdd(old, row),
      );
    },
    onError: (e) => handleError(e, t),
  });
}
