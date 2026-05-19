"use client";

import { useAuthQuery } from "@/hooks/auth/auth-hook";
import {
  deleteLocalPersona,
  readLocalPersona,
  readLocalPersonas,
  upsertLocalPersona,
} from "@/lib/db/client/data/rp";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { parsePersonaJson } from "@/lib/rp/persona-import";
import { uid } from "@/lib/utils/base";
import { handleError } from "@/lib/utils/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { makeRpEntity } from "./factory";
import type { EntityListResponse } from "./shared";

type PersonasList = EntityListResponse<typeof rpc.api.ai.rp.personas.get>;
export type Persona =
  PersonasList extends ReadonlyArray<infer Item> ? Item : never;

const personas = makeRpEntity<
  Persona,
  Record<string, unknown>,
  Record<string, unknown>
>({
  syncKind: "personas",
  listKey: queryKeys.personas,
  itemKey: queryKeys.persona,
  readList: (userId) => readLocalPersonas(userId) as Promise<Persona[] | null>,
  readItem: (userId, id) =>
    readLocalPersona(userId, id) as Promise<Persona | null>,
  upsertLocal: (userId, row) => upsertLocalPersona(userId, row as never),
  deleteLocal: (userId, id) => deleteLocalPersona(userId, id),
});

export const usePersonasQuery = personas.useList;
export const useCreatePersonaMutation = personas.useCreate;
export const useUpdatePersonaMutation = personas.useUpdate;
export const useDeletePersonaMutation = personas.useDelete;

// Client-side persona JSON parser: writes parsed rows to SQLocal.
export function useImportPersonaMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (file: File) => {
      const userId = auth.data?.id ?? 0;
      let raw: unknown;
      try {
        raw = JSON.parse(await file.text());
      } catch {
        throw new Error("ERRORS.REQUEST_FAILED");
      }
      const parsed = parsePersonaJson(raw);
      if (parsed.length === 0) throw new Error("ERRORS.REQUEST_FAILED");
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
      return rows as unknown as Persona[];
    },
    onSuccess: (list) => {
      qc.setQueryData<Persona[]>(queryKeys.personas(), (old) => [
        ...(old ?? []),
        ...list,
      ]);
    },
    onError: (e) => handleError(e, t),
  });
}
