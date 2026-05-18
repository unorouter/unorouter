"use client";

import { useAuthQuery } from "@/hooks/auth-hook";
import { readLocalPersona, readLocalPersonas } from "@/lib/db/client/reads";
import { deleteLocalPersona, upsertLocalPersona } from "@/lib/db/client/writes";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { handleError } from "@/lib/utils/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { makeRpEntity } from "./factory";
import type { EntityListResponse } from "./shared";

type PersonasList = EntityListResponse<typeof rpc.api.rp.personas.get>;
export type Persona =
  PersonasList extends ReadonlyArray<infer Item> ? Item : never;

const personas = makeRpEntity<Persona, Record<string, unknown>, Record<string, unknown>>({
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

// File import returns either a single persona or an array of them. Append all
// returned rows to local + cache.
export function useImportPersonaMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (file: File) =>
      handleElysia(await rpc.api.rp.personas.import.post({ file })),
    onSuccess: async (data) => {
      const userId = auth.data?.id ?? 0;
      const list = Array.isArray(data) ? (data as Persona[]) : [data as Persona];
      for (const row of list) {
        await upsertLocalPersona(userId, row as never);
      }
      qc.setQueryData<Persona[]>(queryKeys.personas(), (old) => [
        ...(old ?? []),
        ...list,
      ]);
    },
    onError: (e) => handleError(e, t),
  });
}
