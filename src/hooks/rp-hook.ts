"use client";

import { useAuthQuery } from "@/hooks/auth-hook";
import { enqueuePending } from "@/lib/db/client/pending-sync";
import {
  readLocalCard,
  readLocalCards,
  readLocalCharacter,
  readLocalCharacters,
  readLocalConversation,
  readLocalConversationBindings,
  readLocalConversationBundle,
  readLocalConversationSettings,
  readLocalLorebook,
  readLocalLorebooks,
  readLocalPersona,
  readLocalPersonas,
  readLocalPreset,
  readLocalPresets,
} from "@/lib/db/client/reads";
import {
  deleteLocalCard,
  deleteLocalCharacter,
  deleteLocalLorebook,
  deleteLocalLorebookEntry,
  deleteLocalPersona,
  deleteLocalPreset,
  replaceLocalConversationBindings,
  upsertLocalCardBundle,
  upsertLocalCharacter,
  upsertLocalConversation,
  upsertLocalConversationSettings,
  upsertLocalLorebook,
  upsertLocalLorebookBundle,
  upsertLocalLorebookEntry,
  upsertLocalPersona,
  upsertLocalPreset,
} from "@/lib/db/client/writes";
import {
  itemPatch,
  listAdd,
  listRemove,
  listUpdate,
} from "@/lib/react-query/cache-helpers";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenArgs, EdenResponse } from "@/lib/types/eden";
import { handleElysia, uid } from "@/lib/utils/base";
import { handleError } from "@/lib/utils/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";

// Pure local-first RP hooks. Queries read SQLocal; mutations write SQLocal
// first; synced rows mirror via POST /api/sync/:kind/:id with keepExpiry.
// No /api/rp/* writes — those endpoints are dead for v4.

type ListResponse<TFn> = TFn extends (...args: never[]) => Promise<infer R>
  ? R extends { data: { data: infer D } }
    ? D
    : never
  : never;

type CharactersList = ListResponse<typeof rpc.api.rp.characters.get>;
type Character =
  CharactersList extends ReadonlyArray<infer Item> ? Item : never;

async function mirrorSyncedRow(
  userId: number,
  kind:
    | "characters"
    | "personas"
    | "lorebooks"
    | "presets"
    | "cards"
    | "conversations",
  id: string,
  payload: unknown,
) {
  try {
    handleElysia(
      await rpc.api.sync({ kind })({ id }).post({ payload, keepExpiry: true }),
    );
  } catch (err) {
    await enqueuePending(userId, kind, id, "patch", err);
  }
}

async function deleteSyncedRow(
  userId: number,
  kind:
    | "characters"
    | "personas"
    | "lorebooks"
    | "presets"
    | "cards"
    | "conversations",
  id: string,
) {
  try {
    handleElysia(await rpc.api.sync({ kind })({ id }).delete());
  } catch (err) {
    await enqueuePending(userId, kind, id, "delete", err);
  }
}

async function mirrorConvIfSynced(userId: number, convId: string) {
  const conv = await readLocalConversation(userId, convId);
  const syncExpiresAt = conv?.syncExpiresAt;
  if (syncExpiresAt == null) return;
  const bundle = await readLocalConversationBundle(userId, convId);
  if (!bundle) return;
  await mirrorSyncedRow(userId, "conversations", convId, bundle);
}

// ---------------------------------------------------------------------------
// Characters
// ---------------------------------------------------------------------------

export function useCharactersQuery() {
  const auth = useAuthQuery();
  const isLoggedIn = !!auth.data;
  return useQuery({
    queryKey: queryKeys.characters(),
    queryFn: async () => {
      const userId = auth.data?.id;
      if (userId == null) return [] as Character[];
      const local = await readLocalCharacters(userId);
      return (local ?? []) as Character[];
    },
    enabled: isLoggedIn,
  });
}

export function useCreateCharacterMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.rp.characters, "post">,
    ) => {
      const userId = auth.data?.id;
      if (userId == null) throw new Error("not-logged-in");
      const now = dayjs().toDate();
      const row = {
        ...args.body,
        id: uid(),
        userId,
        syncExpiresAt: null,
        createdAt: now,
        updatedAt: now,
      };
      await upsertLocalCharacter(userId, row);
      return row;
    },
    onSuccess: (data) => {
      qc.setQueryData<Character[]>(queryKeys.characters(), (old) =>
        listAdd(old, data as unknown as Character),
      );
    },
    onError: (e) => handleError(e, t),
  });
}

export function useUpdateCharacterMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      body: EdenArgs<ReturnType<typeof rpc.api.rp.characters>, "put">["body"];
    }) => {
      const userId = auth.data?.id;
      if (userId == null) throw new Error("not-logged-in");
      const existing = await readLocalCharacter(userId, args.id);
      if (!existing) throw new Error("not-found");
      const now = dayjs().toDate();
      const updated = {
        ...existing,
        ...args.body,
        updatedAt: now,
      };
      await upsertLocalCharacter(userId, updated as never);
      if (existing.syncExpiresAt != null) {
        await mirrorSyncedRow(userId, "characters", args.id, updated);
      }
      return updated;
    },
    onSuccess: (data, args) => {
      const patch = data as Partial<Character> & Character;
      qc.setQueryData<Character[]>(queryKeys.characters(), (old) =>
        listUpdate(old, args.id, patch),
      );
      qc.setQueryData<Character>(queryKeys.character(args.id), (old) =>
        itemPatch(old, patch),
      );
    },
    onError: (e) => handleError(e, t),
  });
}

export function useDeleteCharacterMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (id: string) => {
      const userId = auth.data?.id;
      if (userId == null) throw new Error("not-logged-in");
      const existing = await readLocalCharacter(userId, id);
      const wasSynced =
        existing?.syncExpiresAt !=
        null;
      await deleteLocalCharacter(userId, id);
      if (wasSynced) await deleteSyncedRow(userId, "characters", id);
      return { id };
    },
    onSuccess: (_data, id) => {
      qc.setQueryData<Character[]>(queryKeys.characters(), (old) =>
        listRemove(old, id),
      );
      qc.removeQueries({ queryKey: queryKeys.character(id) });
      qc.invalidateQueries({ queryKey: queryKeys.syncState() });
    },
    onError: (e) => handleError(e, t),
  });
}

// Imports go through server (file parsing). Returned row is written locally.
export function useImportCharacterCardMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (file: File) =>
      handleElysia(await rpc.api.rp.characters.import.post({ file })),
    onSuccess: async (data) => {
      const userId = auth.data?.id;
      if (userId != null) {
        await upsertLocalCharacter(userId, data as never);
      }
      qc.setQueryData<Character[]>(queryKeys.characters(), (old) =>
        listAdd(old, data as Character),
      );
    },
    onError: (e) => handleError(e, t),
  });
}

// ---------------------------------------------------------------------------
// Personas
// ---------------------------------------------------------------------------

type PersonasList = ListResponse<typeof rpc.api.rp.personas.get>;
type Persona = PersonasList extends ReadonlyArray<infer Item> ? Item : never;

export function usePersonasQuery() {
  const auth = useAuthQuery();
  return useQuery({
    queryKey: queryKeys.personas(),
    queryFn: async () => {
      const userId = auth.data?.id;
      if (userId == null) return [] as Persona[];
      const local = await readLocalPersonas(userId);
      return (local ?? []) as Persona[];
    },
    enabled: !!auth.data,
  });
}

export function useCreatePersonaMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (args: EdenArgs<typeof rpc.api.rp.personas, "post">) => {
      const userId = auth.data?.id;
      if (userId == null) throw new Error("not-logged-in");
      const now = dayjs().toDate();
      const row = {
        ...args.body,
        id: uid(),
        userId,
        syncExpiresAt: null,
        createdAt: now,
        updatedAt: now,
      };
      await upsertLocalPersona(userId, row);
      return row;
    },
    onSuccess: (data) => {
      qc.setQueryData<Persona[]>(queryKeys.personas(), (old) =>
        listAdd(old, data as unknown as Persona),
      );
    },
    onError: (e) => handleError(e, t),
  });
}

export function useUpdatePersonaMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      body: EdenArgs<ReturnType<typeof rpc.api.rp.personas>, "put">["body"];
    }) => {
      const userId = auth.data?.id;
      if (userId == null) throw new Error("not-logged-in");
      const existing = await readLocalPersona(userId, args.id);
      if (!existing) throw new Error("not-found");
      const now = dayjs().toDate();
      const updated = {
        ...existing,
        ...args.body,
        updatedAt: now,
      };
      await upsertLocalPersona(userId, updated as never);
      if (existing.syncExpiresAt != null) {
        await mirrorSyncedRow(userId, "personas", args.id, updated);
      }
      return updated;
    },
    onSuccess: (data, args) => {
      const patch = data as Partial<Persona>;
      qc.setQueryData<Persona[]>(queryKeys.personas(), (old) =>
        listUpdate(old, args.id, patch),
      );
      qc.setQueryData<Persona>(queryKeys.persona(args.id), (old) =>
        itemPatch(old, patch),
      );
    },
    onError: (e) => handleError(e, t),
  });
}

export function useDeletePersonaMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (id: string) => {
      const userId = auth.data?.id;
      if (userId == null) throw new Error("not-logged-in");
      const existing = await readLocalPersona(userId, id);
      const wasSynced =
        existing?.syncExpiresAt !=
        null;
      await deleteLocalPersona(userId, id);
      if (wasSynced) await deleteSyncedRow(userId, "personas", id);
      return { id };
    },
    onSuccess: (_data, id) => {
      qc.setQueryData<Persona[]>(queryKeys.personas(), (old) =>
        listRemove(old, id),
      );
      qc.removeQueries({ queryKey: queryKeys.persona(id) });
      qc.invalidateQueries({ queryKey: queryKeys.syncState() });
    },
    onError: (e) => handleError(e, t),
  });
}

export function useImportPersonaMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (file: File) =>
      handleElysia(await rpc.api.rp.personas.import.post({ file })),
    onSuccess: async (data) => {
      const userId = auth.data?.id;
      const list = Array.isArray(data)
        ? (data as Persona[])
        : [data as Persona];
      if (userId != null) {
        for (const row of list) {
          await upsertLocalPersona(userId, row as never);
        }
      }
      qc.setQueryData<Persona[]>(queryKeys.personas(), (old) => [
        ...(old ?? []),
        ...list,
      ]);
    },
    onError: (e) => handleError(e, t),
  });
}

// ---------------------------------------------------------------------------
// Lorebooks (+ entries)
// ---------------------------------------------------------------------------

type LorebooksList = ListResponse<typeof rpc.api.rp.lorebooks.get>;
type Lorebook = LorebooksList extends ReadonlyArray<infer Item> ? Item : never;
type LorebookDetail = EdenResponse<
  ReturnType<typeof rpc.api.rp.lorebooks>,
  "get"
>;
type LorebookEntry = LorebookDetail extends { entries: infer E }
  ? E extends ReadonlyArray<infer Item>
    ? Item
    : never
  : never;

export function useLorebooksQuery() {
  const auth = useAuthQuery();
  return useQuery({
    queryKey: queryKeys.lorebooks(),
    queryFn: async () => {
      const userId = auth.data?.id;
      if (userId == null) return [] as Lorebook[];
      const local = await readLocalLorebooks(userId);
      return (local ?? []) as Lorebook[];
    },
    enabled: !!auth.data,
  });
}

export function useLorebookQuery(id?: string) {
  const auth = useAuthQuery();
  return useQuery({
    queryKey: queryKeys.lorebook(id!),
    queryFn: async () => {
      const userId = auth.data?.id;
      if (userId == null || !id) throw new Error("not-found");
      const local = await readLocalLorebook(userId, id);
      if (!local) throw new Error("not-found");
      return local as unknown as LorebookDetail;
    },
    enabled: !!id && !!auth.data,
  });
}

export function useCreateLorebookMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (args: EdenArgs<typeof rpc.api.rp.lorebooks, "post">) => {
      const userId = auth.data?.id;
      if (userId == null) throw new Error("not-logged-in");
      const now = dayjs().toDate();
      const row = {
        ...args.body,
        id: uid(),
        userId,
        syncExpiresAt: null,
        createdAt: now,
        updatedAt: now,
      };
      await upsertLocalLorebook(userId, row);
      return row;
    },
    onSuccess: (data) => {
      qc.setQueryData<Lorebook[]>(queryKeys.lorebooks(), (old) =>
        listAdd(old, data as unknown as Lorebook),
      );
    },
    onError: (e) => handleError(e, t),
  });
}

export function useUpdateLorebookMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      body: EdenArgs<ReturnType<typeof rpc.api.rp.lorebooks>, "put">["body"];
    }) => {
      const userId = auth.data?.id;
      if (userId == null) throw new Error("not-logged-in");
      const existing = await readLocalLorebook(userId, args.id);
      if (!existing) throw new Error("not-found");
      const now = dayjs().toDate();
      const updated = {
        ...existing,
        ...args.body,
        updatedAt: now,
      };
      await upsertLocalLorebook(userId, updated as never);
      if (existing.syncExpiresAt != null) {
        const lb = await readLocalLorebook(userId, args.id);
        await mirrorSyncedRow(userId, "lorebooks", args.id, {
          lorebook: { ...lb, entries: undefined },
          entries: lb?.entries ?? [],
        });
      }
      return updated;
    },
    onSuccess: (data, args) => {
      const patch = data as Partial<Lorebook>;
      qc.setQueryData<Lorebook[]>(queryKeys.lorebooks(), (old) =>
        listUpdate(old, args.id, patch),
      );
      qc.setQueryData<LorebookDetail>(queryKeys.lorebook(args.id), (old) =>
        itemPatch(old, patch as Partial<LorebookDetail>),
      );
    },
    onError: (e) => handleError(e, t),
  });
}

export function useDeleteLorebookMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (id: string) => {
      const userId = auth.data?.id;
      if (userId == null) throw new Error("not-logged-in");
      const existing = await readLocalLorebook(userId, id);
      const wasSynced =
        existing?.syncExpiresAt !=
        null;
      await deleteLocalLorebook(userId, id);
      if (wasSynced) await deleteSyncedRow(userId, "lorebooks", id);
      return { id };
    },
    onSuccess: (_data, id) => {
      qc.setQueryData<Lorebook[]>(queryKeys.lorebooks(), (old) =>
        listRemove(old, id),
      );
      qc.removeQueries({ queryKey: queryKeys.lorebook(id) });
      qc.invalidateQueries({ queryKey: queryKeys.syncState() });
    },
    onError: (e) => handleError(e, t),
  });
}

export function useImportLorebookMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (file: File) =>
      handleElysia(await rpc.api.rp.lorebooks.import.post({ file })),
    onSuccess: async (data) => {
      const userId = auth.data?.id;
      const lb = data as Lorebook & { entries?: LorebookEntry[] };
      if (userId != null) {
        await upsertLocalLorebookBundle(userId, {
          lorebook: { ...lb, entries: undefined } as never,
          entries: (lb.entries ?? []) as never,
        });
      }
      qc.setQueryData<Lorebook[]>(queryKeys.lorebooks(), (old) =>
        listAdd(old, lb as Lorebook),
      );
    },
    onError: (e) => handleError(e, t),
  });
}

function patchLorebookEntries(
  qc: ReturnType<typeof useQueryClient>,
  lorebookId: string,
  fn: (entries: LorebookEntry[]) => LorebookEntry[],
) {
  qc.setQueryData<LorebookDetail>(queryKeys.lorebook(lorebookId), (old) =>
    old ? { ...old, entries: fn(old.entries) } : old,
  );
}

async function mirrorLorebookIfSynced(userId: number, lorebookId: string) {
  const lb = await readLocalLorebook(userId, lorebookId);
  if (!lb) return;
  if (lb.syncExpiresAt == null) return;
  await mirrorSyncedRow(userId, "lorebooks", lorebookId, {
    lorebook: { ...lb, entries: undefined },
    entries: lb.entries,
  });
}

export function useCreateLorebookEntryMutation(lorebookId: string) {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (
      body: EdenArgs<
        ReturnType<typeof rpc.api.rp.lorebooks>["entries"],
        "post"
      >["body"],
    ) => {
      const userId = auth.data?.id;
      if (userId == null) throw new Error("not-logged-in");
      const now = dayjs().toDate();
      const row = {
        ...body,
        id: uid(),
        lorebookId,
        createdAt: now,
        updatedAt: now,
      };
      await upsertLocalLorebookEntry(userId, row);
      await mirrorLorebookIfSynced(userId, lorebookId);
      return row;
    },
    onSuccess: (data) => {
      patchLorebookEntries(qc, lorebookId, (entries) => [
        ...entries,
        data as unknown as LorebookEntry,
      ]);
    },
    onError: (e) => handleError(e, t),
  });
}

export function useUpdateLorebookEntryMutation(lorebookId: string) {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (args: {
      entryId: string;
      body: EdenArgs<
        ReturnType<ReturnType<typeof rpc.api.rp.lorebooks>["entries"]>,
        "put"
      >["body"];
    }) => {
      const userId = auth.data?.id;
      if (userId == null) throw new Error("not-logged-in");
      const now = dayjs().toDate();
      const lb = await readLocalLorebook(userId, lorebookId);
      const existing = lb?.entries.find(
        (e) => e.id === args.entryId,
      );
      const updated = {
        ...(existing ?? {}),
        id: args.entryId,
        lorebookId,
        ...args.body,
        updatedAt: now,
      };
      await upsertLocalLorebookEntry(userId, updated);
      await mirrorLorebookIfSynced(userId, lorebookId);
      return updated;
    },
    onSuccess: (data, args) => {
      const patch = data as Partial<LorebookEntry>;
      patchLorebookEntries(qc, lorebookId, (entries) =>
        entries.map((e) =>
          e.id === args.entryId ? { ...e, ...patch } : e,
        ),
      );
    },
    onError: (e) => handleError(e, t),
  });
}

export function useDeleteLorebookEntryMutation(lorebookId: string) {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (entryId: string) => {
      const userId = auth.data?.id;
      if (userId == null) throw new Error("not-logged-in");
      await deleteLocalLorebookEntry(userId, entryId);
      await mirrorLorebookIfSynced(userId, lorebookId);
      return { id: entryId };
    },
    onSuccess: (_data, entryId) => {
      patchLorebookEntries(qc, lorebookId, (entries) =>
        entries.filter((e) => e.id !== entryId),
      );
    },
    onError: (e) => handleError(e, t),
  });
}

// ---------------------------------------------------------------------------
// Sampling presets
// ---------------------------------------------------------------------------

type PresetsList = ListResponse<typeof rpc.api.rp.presets.get>;
type Preset = PresetsList extends ReadonlyArray<infer Item> ? Item : never;

export function usePresetsQuery() {
  const auth = useAuthQuery();
  return useQuery({
    queryKey: queryKeys.presets(),
    queryFn: async () => {
      const userId = auth.data?.id;
      if (userId == null) return [] as Preset[];
      const local = await readLocalPresets(userId);
      return (local ?? []) as Preset[];
    },
    enabled: !!auth.data,
  });
}

export function useCreatePresetMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (args: EdenArgs<typeof rpc.api.rp.presets, "post">) => {
      const userId = auth.data?.id;
      if (userId == null) throw new Error("not-logged-in");
      const now = dayjs().toDate();
      const row = {
        ...args.body,
        id: uid(),
        userId,
        syncExpiresAt: null,
        createdAt: now,
        updatedAt: now,
      };
      await upsertLocalPreset(userId, row);
      return row;
    },
    onSuccess: (data) => {
      qc.setQueryData<Preset[]>(queryKeys.presets(), (old) =>
        listAdd(old, data as unknown as Preset),
      );
    },
    onError: (e) => handleError(e, t),
  });
}

export function useUpdatePresetMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      body: EdenArgs<ReturnType<typeof rpc.api.rp.presets>, "put">["body"];
    }) => {
      const userId = auth.data?.id;
      if (userId == null) throw new Error("not-logged-in");
      const existing = await readLocalPreset(userId, args.id);
      if (!existing) throw new Error("not-found");
      const now = dayjs().toDate();
      const updated = {
        ...existing,
        ...args.body,
        updatedAt: now,
      };
      await upsertLocalPreset(userId, updated as never);
      if (existing.syncExpiresAt != null) {
        await mirrorSyncedRow(userId, "presets", args.id, updated);
      }
      return updated;
    },
    onSuccess: (data, args) => {
      const patch = data as Partial<Preset>;
      qc.setQueryData<Preset[]>(queryKeys.presets(), (old) =>
        listUpdate(old, args.id, patch),
      );
      qc.setQueryData<Preset>(queryKeys.preset(args.id), (old) =>
        itemPatch(old, patch),
      );
    },
    onError: (e) => handleError(e, t),
  });
}

export function useDeletePresetMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (id: string) => {
      const userId = auth.data?.id;
      if (userId == null) throw new Error("not-logged-in");
      const existing = await readLocalPreset(userId, id);
      const wasSynced =
        existing?.syncExpiresAt !=
        null;
      await deleteLocalPreset(userId, id);
      if (wasSynced) await deleteSyncedRow(userId, "presets", id);
      return { id };
    },
    onSuccess: (_data, id) => {
      qc.setQueryData<Preset[]>(queryKeys.presets(), (old) =>
        listRemove(old, id),
      );
      qc.removeQueries({ queryKey: queryKeys.preset(id) });
      qc.invalidateQueries({ queryKey: queryKeys.syncState() });
    },
    onError: (e) => handleError(e, t),
  });
}

// ---------------------------------------------------------------------------
// Cards (+ junctions)
// ---------------------------------------------------------------------------

type CardsList = ListResponse<typeof rpc.api.rp.cards.get>;
type Card = CardsList extends ReadonlyArray<infer Item> ? Item : never;

export function useCardsQuery() {
  const auth = useAuthQuery();
  return useQuery({
    queryKey: queryKeys.cards(),
    queryFn: async () => {
      const userId = auth.data?.id;
      if (userId == null) return [] as Card[];
      const local = await readLocalCards(userId);
      return (local ?? []) as Card[];
    },
    enabled: !!auth.data,
  });
}

export function useCardQuery(id: string | undefined) {
  const auth = useAuthQuery();
  return useQuery({
    queryKey: queryKeys.card(id ?? ""),
    queryFn: async () => {
      const userId = auth.data?.id;
      if (userId == null || !id) throw new Error("not-found");
      const local = await readLocalCard(userId, id);
      if (!local) throw new Error("not-found");
      return local;
    },
    enabled: !!id && !!auth.data,
  });
}

export function useCreateCardMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (args: EdenArgs<typeof rpc.api.rp.cards, "post">) => {
      const userId = auth.data?.id;
      if (userId == null) throw new Error("not-logged-in");
      const body = args.body;
      const now = dayjs().toDate();
      const card = {
        id: uid(),
        userId,
        name: body.name,
        description: body.description ?? null,
        personaId: body.personaId ?? null,
        syncExpiresAt: null,
        createdAt: now,
        updatedAt: now,
      };
      const characterIds = body.characterIds ?? [];
      const lorebookIds = body.lorebookIds ?? [];
      await upsertLocalCardBundle(userId, {
        card: card as never,
        cardCharacters: characterIds.map((cid, i) => ({
          cardId: card.id,
          characterId: cid,
          orderIndex: i,
        })),
        cardLorebooks: lorebookIds.map((lid, i) => ({
          cardId: card.id,
          lorebookId: lid,
          orderIndex: i,
        })),
      });
      return card;
    },
    onSuccess: (data) => {
      qc.setQueryData<Card[]>(queryKeys.cards(), (old) =>
        listAdd(old, data as unknown as Card),
      );
    },
    onError: (e) => handleError(e, t),
  });
}

export function useUpdateCardMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      body: EdenArgs<ReturnType<typeof rpc.api.rp.cards>, "put">["body"];
    }) => {
      const userId = auth.data?.id;
      if (userId == null) throw new Error("not-logged-in");
      const existing = await readLocalCard(userId, args.id);
      if (!existing) throw new Error("not-found");
      const body = args.body;
      const now = dayjs().toDate();
      const updatedCard = {
        ...existing,
        ...body,
        cardCharacters: undefined,
        cardLorebooks: undefined,
        updatedAt: now,
      };
      const characterIds =
        body.characterIds ??
        existing.cardCharacters.map((c) => c.characterId);
      const lorebookIds =
        body.lorebookIds ??
        existing.cardLorebooks.map((l) => l.lorebookId);
      await upsertLocalCardBundle(userId, {
        card: updatedCard as never,
        cardCharacters: characterIds.map((cid, i) => ({
          cardId: args.id,
          characterId: cid,
          orderIndex: i,
        })),
        cardLorebooks: lorebookIds.map((lid, i) => ({
          cardId: args.id,
          lorebookId: lid,
          orderIndex: i,
        })),
      });
      if (existing.syncExpiresAt != null) {
        const fresh = await readLocalCard(userId, args.id);
        await mirrorSyncedRow(userId, "cards", args.id, {
          card: {
            ...fresh,
            cardCharacters: undefined,
            cardLorebooks: undefined,
          },
          cardCharacters: fresh?.cardCharacters ?? [],
          cardLorebooks: fresh?.cardLorebooks ?? [],
        });
      }
      return updatedCard;
    },
    onSuccess: (data, args) => {
      const patch = data as Partial<Card>;
      qc.setQueryData<Card[]>(queryKeys.cards(), (old) =>
        listUpdate(old, args.id, patch),
      );
      qc.setQueryData<Card>(queryKeys.card(args.id), (old) =>
        itemPatch(old, patch),
      );
    },
    onError: (e) => handleError(e, t),
  });
}

export function useDeleteCardMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (id: string) => {
      const userId = auth.data?.id;
      if (userId == null) throw new Error("not-logged-in");
      const existing = await readLocalCard(userId, id);
      const wasSynced =
        existing?.syncExpiresAt !=
        null;
      await deleteLocalCard(userId, id);
      if (wasSynced) await deleteSyncedRow(userId, "cards", id);
      return { id };
    },
    onSuccess: (_data, id) => {
      qc.setQueryData<Card[]>(queryKeys.cards(), (old) => listRemove(old, id));
      qc.removeQueries({ queryKey: queryKeys.card(id) });
      qc.invalidateQueries({ queryKey: queryKeys.syncState() });
    },
    onError: (e) => handleError(e, t),
  });
}

export function useApplyCardMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      body: { convId: string; mode: "replace" | "merge" };
    }) => {
      const userId = auth.data?.id;
      if (userId == null) throw new Error("not-logged-in");
      const card = await readLocalCard(userId, args.id);
      if (!card) throw new Error("card-not-found");
      const characterIds = card.cardCharacters.map(
        (c) => c.characterId,
      );
      const lorebookIds = card.cardLorebooks.map(
        (l) => l.lorebookId,
      );
      if (args.body.mode === "replace") {
        await replaceLocalConversationBindings(userId, args.body.convId, {
          conversationCharacters: characterIds.map((cid) => ({
            characterId: cid,
          })),
          conversationLorebooks: lorebookIds.map((lid) => ({
            lorebookId: lid,
          })),
        });
      } else {
        // merge: read existing, dedupe
        const existing = await readLocalConversationBindings(
          userId,
          args.body.convId,
        );
        const existingCharIds = new Set(
          existing?.conversationCharacters.map(
            (c) => c.characterId,
          ) ?? [],
        );
        const existingLbIds = new Set(
          existing?.conversationLorebooks.map(
            (l) => l.lorebookId,
          ) ?? [],
        );
        const combinedChars = [
          ...(existing?.conversationCharacters ?? []),
          ...characterIds
            .filter((cid) => !existingCharIds.has(cid))
            .map((cid) => ({ characterId: cid })),
        ];
        const combinedLbs = [
          ...(existing?.conversationLorebooks ?? []),
          ...lorebookIds
            .filter((lid) => !existingLbIds.has(lid))
            .map((lid) => ({ lorebookId: lid })),
        ];
        await replaceLocalConversationBindings(userId, args.body.convId, {
          conversationCharacters: combinedChars.map((c) => ({
            characterId: c.characterId,
          })),
          conversationLorebooks: combinedLbs.map((l) => ({
            lorebookId: l.lorebookId,
          })),
        });
      }
      // Also pin personaId in settings if card has one
      if (card.personaId) {
        const settings = await readLocalConversationSettings(
          userId,
          args.body.convId,
        );
        if (settings) {
          await upsertLocalConversationSettings(userId, {
            ...settings,
            personaId: card.personaId,
            updatedAt: dayjs().toDate(),
          });
        }
      }
      await mirrorConvIfSynced(userId, args.body.convId);
      return { id: args.id };
    },
    onSuccess: (_data, args) => {
      qc.invalidateQueries({
        queryKey: queryKeys.chatBindings(args.body.convId),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.chatSettings(args.body.convId),
      });
    },
    onError: (e) => handleError(e, t),
  });
}

// ---------------------------------------------------------------------------
// Conversation settings + bindings
// ---------------------------------------------------------------------------

type ChatSettings = EdenResponse<
  ReturnType<typeof rpc.api.rp.conversations>["settings"],
  "get"
>;
type ChatBindings = EdenResponse<
  ReturnType<typeof rpc.api.rp.conversations>["bindings"],
  "get"
>;

export function useChatSettingsQuery(convId?: string) {
  const auth = useAuthQuery();
  return useQuery({
    queryKey: queryKeys.chatSettings(convId!),
    queryFn: async () => {
      const userId = auth.data?.id;
      if (userId == null || !convId) throw new Error("not-found");
      const local = await readLocalConversationSettings(userId, convId);
      if (!local) throw new Error("not-found");
      return local as unknown as ChatSettings;
    },
    enabled: !!convId && !!auth.data,
  });
}

export function useUpdateChatSettingsMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (args: {
      convId: string;
      body: EdenArgs<
        ReturnType<typeof rpc.api.rp.conversations>["settings"],
        "put"
      >["body"];
    }) => {
      const userId = auth.data?.id;
      if (userId == null) throw new Error("not-logged-in");
      const existing = await readLocalConversationSettings(userId, args.convId);
      const now = dayjs().toDate();
      const updated = {
        ...(existing ?? { convId: args.convId, defaultModel: "" }),
        ...args.body,
        convId: args.convId,
        updatedAt: now,
      };
      await upsertLocalConversationSettings(userId, updated);
      // Also bump conv updatedAt
      const conv = await readLocalConversation(userId, args.convId);
      if (conv) {
        await upsertLocalConversation(userId, {
          ...conv,
          updatedAt: now,
        });
      }
      await mirrorConvIfSynced(userId, args.convId);
      return updated;
    },
    onSuccess: (data, args) => {
      qc.setQueryData<ChatSettings>(
        queryKeys.chatSettings(args.convId),
        (old) =>
          old
            ? itemPatch(old, data as Partial<ChatSettings>)
            : (data as unknown as ChatSettings),
      );
    },
    onError: (e) => handleError(e, t),
  });
}

export function useChatBindingsQuery(convId?: string) {
  const auth = useAuthQuery();
  return useQuery({
    queryKey: queryKeys.chatBindings(convId!),
    queryFn: async () => {
      const userId = auth.data?.id;
      if (userId == null || !convId) throw new Error("not-found");
      const local = await readLocalConversationBindings(userId, convId);
      // Surface shape consumer expects: { characters: [...], lorebooks: [...] }
      // bindings reads expose `conversationCharacters` etc. — match the server
      // shape consumers already use.
      return {
        characters: local?.conversationCharacters ?? [],
        lorebooks: local?.conversationLorebooks ?? [],
      } as unknown as ChatBindings;
    },
    enabled: !!convId && !!auth.data,
  });
}

export function useUpdateChatBindingsMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (args: {
      convId: string;
      body: EdenArgs<
        ReturnType<typeof rpc.api.rp.conversations>["bindings"],
        "put"
      >["body"];
    }) => {
      const userId = auth.data?.id;
      if (userId == null) throw new Error("not-logged-in");
      const body = args.body as {
        characterIds?: string[];
        lorebookIds?: string[];
      };
      await replaceLocalConversationBindings(userId, args.convId, {
        conversationCharacters: (body.characterIds ?? []).map((cid) => ({
          characterId: cid,
        })),
        conversationLorebooks: (body.lorebookIds ?? []).map((lid) => ({
          lorebookId: lid,
        })),
      });
      const now = dayjs().toDate();
      const conv = await readLocalConversation(userId, args.convId);
      if (conv) {
        await upsertLocalConversation(userId, { ...conv, updatedAt: now });
      }
      await mirrorConvIfSynced(userId, args.convId);
      const fresh = await readLocalConversationBindings(userId, args.convId);
      return {
        characters: fresh?.conversationCharacters ?? [],
        lorebooks: fresh?.conversationLorebooks ?? [],
      };
    },
    onSuccess: (data, args) => {
      qc.setQueryData<ChatBindings>(
        queryKeys.chatBindings(args.convId),
        () => data as unknown as ChatBindings,
      );
    },
    onError: (e) => handleError(e, t),
  });
}

// ---------------------------------------------------------------------------
// Export / Import (conversation level)
// ---------------------------------------------------------------------------

export function useImportConversationMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) =>
      handleElysia(await rpc.api.rp.conversations.import.post({ file })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.conversations() });
    },
    onError: (e) => handleError(e, t),
  });
}

/**
 * Export a single conversation as native (`unorouter.1.0`) or `orpg.3.0`
 * JSON. Returns the JSON object; the caller serializes + triggers download.
 */
export function useExportConversation() {
  const t = useTranslations();
  return useMutation({
    onError: (e) => handleError(e, t),
    mutationFn: async (args: { convId: string; format: "native" | "orpg" }) =>
      handleElysia(
        await rpc.api.rp
          .conversations({ id: args.convId })
          .export.get({ query: { format: args.format } }),
      ),
  });
}
