"use client";

import { useLocalUserId } from "@/hooks/auth/use-local-user-id";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { parsePersonaJson } from "@/lib/ai/rp/persona-import";
import {
  deleteLocalPersona,
  readLocalPersona,
  readLocalPersonas,
  upsertLocalPersona,
} from "@/lib/db/client/data/rp";
import type { PersonaRow } from "@/lib/db/schema/rows";
import { queryKeys } from "@/lib/react-query/keys";
import { uid } from "@/lib/utils/base";
import { dayjs } from "@/lib/utils/format/date";
import { useTranslations } from "next-intl";
import { makeRpEntity } from "./factory";

const personas = makeRpEntity<
  PersonaRow,
  Record<string, unknown>,
  Record<string, unknown>
>({
  listKey: queryKeys.personas,
  itemKey: queryKeys.persona,
  readList: readLocalPersonas,
  readItem: readLocalPersona,
  upsertLocal: upsertLocalPersona,
  deleteLocal: deleteLocalPersona,
});

export const usePersonasQuery = personas.useList;
export const usePersonaQuery = personas.useItem;
export const useCreatePersonaMutation = personas.useCreate;
export const useUpdatePersonaMutation = personas.useUpdate;
export const useDeletePersonaMutation = personas.useDelete;

export function useImportPersonaMutation() {
  const t = useTranslations();
  const userId = useLocalUserId();

  return useApiMutation({
    mutationFn: async (file: File) => {
      let raw: unknown;
      try {
        raw = JSON.parse(await file.text());
      } catch {
        throw new Error(t("ERRORS.REQUEST_FAILED"));
      }
      const parsed = parsePersonaJson(raw);
      if (parsed.length === 0) throw new Error(t("ERRORS.REQUEST_FAILED"));
      const now = dayjs().toDate();
      const rows = parsed.map((p) => ({
        id: uid(),
        userId,
        name: p.name,
        description: p.description ?? null,
        avatarMediaId: null,
        isDefault: false,
        notes: null,
        syncExpiresAt: null,
        createdAt: now,
        updatedAt: now,
      }));
      for (const row of rows) {
        await upsertLocalPersona(userId, row as never);
      }
      return rows;
    },
    invalidates: [queryKeys.personas()],
  });
}
