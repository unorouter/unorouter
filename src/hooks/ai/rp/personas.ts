"use client";

import { useApiMutation } from "@/lib/react-query/hooks";
import { parsePersonaJson } from "@/lib/ai/rp/persona-import";
import {
  deleteLocalPersona,
  readLocalPersona,
  readLocalPersonas,
  upsertLocalPersona,
} from "@/lib/db/client/data/rp/rp";
import type { PersonaRow } from "@/lib/db/schema/rows";
import { msg } from "@/lib/config/constants";
import { queryKeys } from "@/lib/react-query/keys";
import { runUrlImport } from "./use-url-import";
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
export const useDuplicatePersonaMutation = personas.useDuplicate;

export function useImportPersonaMutation() {
  const t = useTranslations();

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
        name: p.name,
        description: p.description ?? null,
        avatarMediaId: null,
        isDefault: false,
        notes: null,
        createdAt: now,
        updatedAt: now,
      }));
      for (const row of rows) {
        await upsertLocalPersona(row);
      }
      return rows;
    },
    invalidates: [queryKeys.personas()],
  });
}

// LoreBary is the only site that publishes personas; everywhere else a persona
// is private account data. Its extra fields (archetype, gender, pronouns, age,
// traits) have no columns here, so they are folded into the description rather
// than dropped.
export function useImportPersonaFromUrlMutation() {
  return useApiMutation({
    mutationFn: (input: string) =>
      runUrlImport(input, async (result) => {
        const found = result.personas ?? [];
        if (found.length === 0)
          throw new Error(msg("ERRORS.CARD_IMPORT_FETCH_FAILED"));
        const now = dayjs().toDate();
        const rows = found.map((p) => {
          const attrs = Object.entries(p.attributes ?? {})
            .map(([k, v]) => `${k}: ${v}`)
            .join("\n");
          return {
            id: uid(),
            name: p.name,
            description:
              [p.description, attrs].filter(Boolean).join("\n\n") || null,
            avatarMediaId: null,
            isDefault: false,
            notes: null,
            createdAt: now,
            updatedAt: now,
          };
        });
        for (const row of rows) await upsertLocalPersona(row);
        return rows;
      }),
    invalidates: [queryKeys.personas()],
  });
}
