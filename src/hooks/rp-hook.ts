"use client";

import { useAuthQuery } from "@/hooks/auth-hook";
import { enqueuePending } from "@/lib/local-db/pending-sync";
import {
  readLocalCharacter,
  readLocalCharacters,
} from "@/lib/local-db/reads";
import {
  deleteLocalCharacter,
  upsertLocalCharacter,
} from "@/lib/local-db/writes";
import {
  itemPatch,
  listAdd,
  listRemove,
  listUpdate,
} from "@/lib/react-query/cache-helpers";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenArgs, EdenResponse } from "@/lib/types/eden";
import { handleElysia } from "@/lib/utils/base";
import { handleError } from "@/lib/utils/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

// `EdenResponse<rpc.api.rp.characters, "get">` resolves to the *single* item
// type because the route is hybrid (parameterized `({id}).get` wins over the
// static list `.get`). `ListResponse` peels the wrapper off the static list
// directly.
type ListResponse<TFn> = TFn extends (...args: never[]) => Promise<infer R>
  ? R extends { data: { data: infer D } }
    ? D
    : never
  : never;

// ---------------------------------------------------------------------------
// Characters
// ---------------------------------------------------------------------------

type CharactersList = ListResponse<typeof rpc.api.rp.characters.get>;
type Character =
  CharactersList extends ReadonlyArray<infer Item> ? Item : never;

// IDB-first hybrid: try SQLocal first; fall back to server when local is
// empty AND user is logged in. Server hits get written through to SQLocal
// so subsequent reads stay local. Pattern repeats per kind (persona /
// lorebook / preset / card / conversation) and follows the exact same
// shape; only the entity name varies.
export function useCharactersQuery() {
  const isLoggedIn = !!useAuthQuery().data;
  const auth = useAuthQuery();
  return useQuery({
    queryKey: queryKeys.characters(),
    queryFn: async () => {
      const userId = auth.data?.id;
      if (userId != null) {
        const local = await readLocalCharacters(userId);
        if (local && local.length > 0) return local as Character[];
      }
      const remote = handleElysia(
        await rpc.api.rp.characters.get(),
      ) as Character[];
      if (userId != null) {
        for (const row of remote) {
          await upsertLocalCharacter(userId, row as never);
        }
      }
      return remote;
    },
    enabled: isLoggedIn,
  });
}

export function useCreateCharacterMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (args: EdenArgs<typeof rpc.api.rp.characters, "post">) =>
      handleElysia(await rpc.api.rp.characters.post(args.body)),
    onSuccess: async (data) => {
      const character = data as Character;
      const userId = auth.data?.id;
      if (userId != null) {
        await upsertLocalCharacter(userId, character as never);
      }
      qc.setQueryData<Character[]>(queryKeys.characters(), (old) =>
        listAdd(old, character),
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
    }) =>
      handleElysia(await rpc.api.rp.characters({ id: args.id }).put(args.body)),
    onSuccess: async (data, args) => {
      const patch = data as Partial<Character> & Character;
      const userId = auth.data?.id;
      qc.setQueryData<Character[]>(queryKeys.characters(), (old) =>
        listUpdate(old, args.id, patch),
      );
      qc.setQueryData<Character>(queryKeys.character(args.id), (old) =>
        itemPatch(old, patch),
      );
      if (userId == null) return;
      // Write-through to SQLocal.
      await upsertLocalCharacter(userId, patch as never);
      // If the row was synced, mirror the new content to the server while
      // preserving the existing 30-day window.
      const localRow = await readLocalCharacter(userId, args.id);
      const syncExpiresAt = (
        localRow as { syncExpiresAt?: Date | null } | null
      )?.syncExpiresAt;
      if (syncExpiresAt != null) {
        try {
          handleElysia(
            await rpc.api
              .sync({ kind: "characters" })({ id: args.id })
              .post({ payload: patch, keepExpiry: true }),
          );
        } catch (err) {
          await enqueuePending(userId, "characters", args.id, "patch", err);
        }
      }
    },
    onError: (e) => handleError(e, t),
  });
}

export function useDeleteCharacterMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (id: string) =>
      handleElysia(await rpc.api.rp.characters({ id }).delete()),
    onSuccess: async (_data, id) => {
      const userId = auth.data?.id;
      qc.setQueryData<Character[]>(queryKeys.characters(), (old) =>
        listRemove(old, id),
      );
      qc.removeQueries({ queryKey: queryKeys.character(id) });
      qc.invalidateQueries({ queryKey: queryKeys.syncState() });
      if (userId == null) return;
      // Read sync state BEFORE wiping the local row so we know whether to
      // also delete the server mirror.
      const localRow = await readLocalCharacter(userId, id);
      const wasSynced =
        (localRow as { syncExpiresAt?: Date | null } | null)?.syncExpiresAt !=
        null;
      await deleteLocalCharacter(userId, id);
      if (wasSynced) {
        try {
          handleElysia(
            await rpc.api.sync({ kind: "characters" })({ id }).delete(),
          );
        } catch (err) {
          await enqueuePending(userId, "characters", id, "delete", err);
        }
      }
    },
    onError: (e) => handleError(e, t),
  });
}

export function useImportCharacterCardMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) =>
      handleElysia(await rpc.api.rp.characters.import.post({ file })),
    onSuccess: (data) => {
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
  const isLoggedIn = !!useAuthQuery().data;
  return useQuery({
    queryKey: queryKeys.personas(),
    queryFn: async () => handleElysia(await rpc.api.rp.personas.get()),
    enabled: isLoggedIn,
  });
}

export function useCreatePersonaMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: EdenArgs<typeof rpc.api.rp.personas, "post">) =>
      handleElysia(await rpc.api.rp.personas.post(args.body)),
    onSuccess: (data) => {
      qc.setQueryData<Persona[]>(queryKeys.personas(), (old) =>
        listAdd(old, data as Persona),
      );
    },
    onError: (e) => handleError(e, t),
  });
}

export function useUpdatePersonaMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      body: EdenArgs<ReturnType<typeof rpc.api.rp.personas>, "put">["body"];
    }) =>
      handleElysia(await rpc.api.rp.personas({ id: args.id }).put(args.body)),
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
  return useMutation({
    mutationFn: async (id: string) =>
      handleElysia(await rpc.api.rp.personas({ id }).delete()),
    onSuccess: (_data, id) => {
      qc.setQueryData<Persona[]>(queryKeys.personas(), (old) =>
        listRemove(old, id),
      );
      qc.removeQueries({ queryKey: queryKeys.persona(id) });
    },
    onError: (e) => handleError(e, t),
  });
}

export function useImportPersonaMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) =>
      handleElysia(await rpc.api.rp.personas.import.post({ file })),
    onSuccess: (data) => {
      // Persona import returns either a single persona or an array (multi-card
      // imports). Append all of them.
      const list = Array.isArray(data)
        ? (data as Persona[])
        : [data as Persona];
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
  const isLoggedIn = !!useAuthQuery().data;
  return useQuery({
    queryKey: queryKeys.lorebooks(),
    queryFn: async () => handleElysia(await rpc.api.rp.lorebooks.get()),
    enabled: isLoggedIn,
  });
}

export function useLorebookQuery(id?: string) {
  return useQuery({
    queryKey: queryKeys.lorebook(id!),
    queryFn: async () =>
      handleElysia(await rpc.api.rp.lorebooks({ id: id! }).get()),
    enabled: !!id,
  });
}

export function useCreateLorebookMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: EdenArgs<typeof rpc.api.rp.lorebooks, "post">) =>
      handleElysia(await rpc.api.rp.lorebooks.post(args.body)),
    onSuccess: (data) => {
      qc.setQueryData<Lorebook[]>(queryKeys.lorebooks(), (old) =>
        listAdd(old, data as Lorebook),
      );
    },
    onError: (e) => handleError(e, t),
  });
}

export function useUpdateLorebookMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      body: EdenArgs<ReturnType<typeof rpc.api.rp.lorebooks>, "put">["body"];
    }) =>
      handleElysia(await rpc.api.rp.lorebooks({ id: args.id }).put(args.body)),
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
  return useMutation({
    mutationFn: async (id: string) =>
      handleElysia(await rpc.api.rp.lorebooks({ id }).delete()),
    onSuccess: (_data, id) => {
      qc.setQueryData<Lorebook[]>(queryKeys.lorebooks(), (old) =>
        listRemove(old, id),
      );
      qc.removeQueries({ queryKey: queryKeys.lorebook(id) });
    },
    onError: (e) => handleError(e, t),
  });
}

export function useImportLorebookMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) =>
      handleElysia(await rpc.api.rp.lorebooks.import.post({ file })),
    onSuccess: (data) => {
      qc.setQueryData<Lorebook[]>(queryKeys.lorebooks(), (old) =>
        listAdd(old, data as Lorebook),
      );
    },
    onError: (e) => handleError(e, t),
  });
}

// Lorebook entries: nested under a specific lorebook detail. Each mutation
// patches the parent lorebook's `entries` array in place.
function patchLorebookEntries(
  qc: ReturnType<typeof useQueryClient>,
  lorebookId: string,
  fn: (entries: LorebookEntry[]) => LorebookEntry[],
) {
  qc.setQueryData<LorebookDetail>(queryKeys.lorebook(lorebookId), (old) =>
    old ? { ...old, entries: fn(old.entries) } : old,
  );
}

export function useCreateLorebookEntryMutation(lorebookId: string) {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      body: EdenArgs<
        ReturnType<typeof rpc.api.rp.lorebooks>["entries"],
        "post"
      >["body"],
    ) =>
      handleElysia(
        await rpc.api.rp.lorebooks({ id: lorebookId }).entries.post(body),
      ),
    onSuccess: (data) => {
      patchLorebookEntries(qc, lorebookId, (entries) => [
        ...entries,
        data as LorebookEntry,
      ]);
    },
    onError: (e) => handleError(e, t),
  });
}

export function useUpdateLorebookEntryMutation(lorebookId: string) {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      entryId: string;
      body: EdenArgs<
        ReturnType<ReturnType<typeof rpc.api.rp.lorebooks>["entries"]>,
        "put"
      >["body"];
    }) =>
      handleElysia(
        await rpc.api.rp
          .lorebooks({ id: lorebookId })
          .entries({ entryId: args.entryId })
          .put(args.body),
      ),
    onSuccess: (data, args) => {
      const patch = data as Partial<LorebookEntry>;
      patchLorebookEntries(qc, lorebookId, (entries) =>
        entries.map((e) => (e.id === args.entryId ? { ...e, ...patch } : e)),
      );
    },
    onError: (e) => handleError(e, t),
  });
}

export function useDeleteLorebookEntryMutation(lorebookId: string) {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entryId: string) =>
      handleElysia(
        await rpc.api.rp
          .lorebooks({ id: lorebookId })
          .entries({ entryId })
          .delete(),
      ),
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
  const isLoggedIn = !!useAuthQuery().data;
  return useQuery({
    queryKey: queryKeys.presets(),
    queryFn: async () => handleElysia(await rpc.api.rp.presets.get()),
    enabled: isLoggedIn,
  });
}

export function useCreatePresetMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: EdenArgs<typeof rpc.api.rp.presets, "post">) =>
      handleElysia(await rpc.api.rp.presets.post(args.body)),
    onSuccess: (data) => {
      qc.setQueryData<Preset[]>(queryKeys.presets(), (old) =>
        listAdd(old, data as Preset),
      );
    },
    onError: (e) => handleError(e, t),
  });
}

export function useUpdatePresetMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      body: EdenArgs<ReturnType<typeof rpc.api.rp.presets>, "put">["body"];
    }) =>
      handleElysia(await rpc.api.rp.presets({ id: args.id }).put(args.body)),
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
  return useMutation({
    mutationFn: async (id: string) =>
      handleElysia(await rpc.api.rp.presets({ id }).delete()),
    onSuccess: (_data, id) => {
      qc.setQueryData<Preset[]>(queryKeys.presets(), (old) =>
        listRemove(old, id),
      );
      qc.removeQueries({ queryKey: queryKeys.preset(id) });
    },
    onError: (e) => handleError(e, t),
  });
}

// ---------------------------------------------------------------------------
// Cards (chars + persona + lorebooks bundle)
// ---------------------------------------------------------------------------

type CardsList = ListResponse<typeof rpc.api.rp.cards.get>;
type Card = CardsList extends ReadonlyArray<infer Item> ? Item : never;

export function useCardsQuery() {
  const isLoggedIn = !!useAuthQuery().data;
  return useQuery({
    queryKey: queryKeys.cards(),
    queryFn: async () => handleElysia(await rpc.api.rp.cards.get()),
    enabled: isLoggedIn,
  });
}

export function useCardQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.card(id ?? ""),
    queryFn: async () =>
      handleElysia(await rpc.api.rp.cards({ id: id! }).get()),
    enabled: !!id,
  });
}

export function useCreateCardMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: EdenArgs<typeof rpc.api.rp.cards, "post">) =>
      handleElysia(await rpc.api.rp.cards.post(args.body)),
    onSuccess: (data) => {
      qc.setQueryData<Card[]>(queryKeys.cards(), (old) =>
        listAdd(old, data as Card),
      );
    },
    onError: (e) => handleError(e, t),
  });
}

export function useUpdateCardMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      body: EdenArgs<ReturnType<typeof rpc.api.rp.cards>, "put">["body"];
    }) => handleElysia(await rpc.api.rp.cards({ id: args.id }).put(args.body)),
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
  return useMutation({
    mutationFn: async (id: string) =>
      handleElysia(await rpc.api.rp.cards({ id }).delete()),
    onSuccess: (_data, id) => {
      qc.setQueryData<Card[]>(queryKeys.cards(), (old) =>
        listRemove(old, id),
      );
      qc.removeQueries({ queryKey: queryKeys.card(id) });
    },
    onError: (e) => handleError(e, t),
  });
}

export function useApplyCardMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      body: { convId: string; mode: "replace" | "merge" };
    }) =>
      handleElysia(
        await rpc.api.rp.cards({ id: args.id }).apply.post(args.body),
      ),
    onSuccess: (_data, args) => {
      // Bindings + settings changed on the target conversation; refetch both.
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
  return useQuery({
    queryKey: queryKeys.chatSettings(convId!),
    queryFn: async () =>
      handleElysia(
        await rpc.api.rp.conversations({ id: convId! }).settings.get(),
      ),
    enabled: !!convId,
  });
}

export function useUpdateChatSettingsMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      convId: string;
      body: EdenArgs<
        ReturnType<typeof rpc.api.rp.conversations>["settings"],
        "put"
      >["body"];
    }) =>
      handleElysia(
        await rpc.api.rp
          .conversations({ id: args.convId })
          .settings.put(args.body),
      ),
    onSuccess: (data, args) => {
      qc.setQueryData<ChatSettings>(
        queryKeys.chatSettings(args.convId),
        (old) =>
          old
            ? itemPatch(old, data as Partial<ChatSettings>)
            : (data as ChatSettings),
      );
    },
    onError: (e) => handleError(e, t),
  });
}

export function useChatBindingsQuery(convId?: string) {
  return useQuery({
    queryKey: queryKeys.chatBindings(convId!),
    queryFn: async () =>
      handleElysia(
        await rpc.api.rp.conversations({ id: convId! }).bindings.get(),
      ),
    enabled: !!convId,
  });
}

export function useUpdateChatBindingsMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      convId: string;
      body: EdenArgs<
        ReturnType<typeof rpc.api.rp.conversations>["bindings"],
        "put"
      >["body"];
    }) =>
      handleElysia(
        await rpc.api.rp
          .conversations({ id: args.convId })
          .bindings.put(args.body),
      ),
    onSuccess: (data, args) => {
      qc.setQueryData<ChatBindings>(
        queryKeys.chatBindings(args.convId),
        () => data as ChatBindings,
      );
    },
    onError: (e) => handleError(e, t),
  });
}

// ---------------------------------------------------------------------------
// Export / Import
// ---------------------------------------------------------------------------

export function useImportConversationMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) =>
      handleElysia(await rpc.api.rp.conversations.import.post({ file })),
    // Server returns only the new convId; not enough to optimistically build a
    // ConvItem. Invalidate so the sidebar list refetches.
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
