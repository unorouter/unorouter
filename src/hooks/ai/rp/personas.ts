"use client";

import { useApiMutation } from "@/lib/react-query/hooks";
import { parsePersonaJson } from "@/lib/ai/rp/persona-import";
import { personaStore } from "@/lib/db/client/data/rp/rp";
import type { PersonaRow } from "@/lib/db/schema/rows";
import { queryKeys } from "@/lib/react-query/keys";
import { uid } from "@/lib/utils/base";
import { dayjs } from "@/lib/utils/format/date";
import { msg } from "@/lib/config/constants";
import { makeRpEntity, readJsonFile } from "./factory";

const personas = makeRpEntity<
  PersonaRow,
  Record<string, unknown>,
  Record<string, unknown>
>({
  listKey: queryKeys.personas,
  itemKey: queryKeys.persona,
  store: personaStore,
});

export const usePersonasQuery = personas.useList;
export const usePersonaQuery = personas.useItem;
export const useCreatePersonaMutation = personas.useCreate;
export const useUpdatePersonaMutation = personas.useUpdate;
export const useDeletePersonaMutation = personas.useDelete;
export const useDuplicatePersonaMutation = personas.useDuplicate;

export function useImportPersonaMutation() {
  return useApiMutation({
    mutationFn: async (file: File) => {
      const raw = await readJsonFile(file, msg("ERRORS.REQUEST_FAILED"));
      const parsed = parsePersonaJson(raw);
      if (parsed.length === 0) throw new Error(msg("ERRORS.REQUEST_FAILED"));
      const now = dayjs().toDate();
      const rows = parsed.map((p) => ({
        id: uid(),
        name: p.name,
        title: p.title ?? null,
        description: p.description ?? null,
        personality: p.personality ?? null,
        avatarMediaId: null,
        isDefault: false,
        notes: null,
        createdAt: now,
        updatedAt: now,
      }));
      for (const row of rows) {
        await personaStore.upsert(row);
      }
      return rows;
    },
    invalidates: [queryKeys.personas()],
  });
}
