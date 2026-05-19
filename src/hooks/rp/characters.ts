"use client";

import { useAuthQuery } from "@/hooks/auth-hook";
import { readLocalCharacter, readLocalCharacters } from "@/lib/db/client/reads";
import {
  deleteLocalCharacter,
  upsertLocalCharacter,
} from "@/lib/db/client/writes";
import { listAdd } from "@/lib/react-query/cache-helpers";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { handleError } from "@/lib/utils/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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

// Server-parsed character card import: BFF returns a parsed row; we write
// it through the same local store the factory uses, then prepend to cache.
export function useImportCharacterCardMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (file: File) =>
      handleElysia(await rpc.api.ai.rp.characters.import.post({ file })),
    onSuccess: async (data) => {
      const userId = auth.data?.id ?? 0;
      await upsertLocalCharacter(userId, data as never);
      qc.setQueryData<Character[]>(queryKeys.characters(), (old) =>
        listAdd(old, data as Character),
      );
    },
    onError: (e) => handleError(e, t),
  });
}
