"use client";

import { useAuthQuery } from "@/hooks/auth-hook";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenArgs, EdenResponse } from "@/lib/types/eden";
import { handleElysia } from "@/lib/utils/base";
import { handleError } from "@/lib/utils/client";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
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
type Character = CharactersList extends ReadonlyArray<infer Item>
  ? Item
  : never;

export function useCharactersQuery() {
  const isLoggedIn = !!useAuthQuery().data;
  return useQuery({
    queryKey: queryKeys.characters(),
    queryFn: async () => handleElysia(await rpc.api.rp.characters.get()),
    enabled: isLoggedIn,
  });
}

export function useCharacterQuery(id?: string) {
  return useQuery({
    queryKey: queryKeys.character(id!),
    queryFn: async () =>
      handleElysia(await rpc.api.rp.characters({ id: id! }).get()),
    enabled: !!id,
  });
}

export function useCreateCharacterMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.rp.characters, "post">,
    ) => handleElysia(await rpc.api.rp.characters.post(args.body)),
    onSuccess: (data) => {
      queryClient.setQueryData<Character[]>(queryKeys.characters(), (old) =>
        old ? [...old, data as Character] : [data as Character],
      );
    },
    onError: (e) => handleError(e, t),
  });
}

export function useUpdateCharacterMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      body: EdenArgs<
        ReturnType<typeof rpc.api.rp.characters>,
        "put"
      >["body"];
    }) =>
      handleElysia(await rpc.api.rp.characters({ id: args.id }).put(args.body)),
    onSuccess: (data, args) => {
      queryClient.setQueryData<Character[]>(queryKeys.characters(), (old) =>
        old?.map((it) =>
          it.id === args.id ? { ...it, ...(data as Partial<Character>) } : it,
        ),
      );
      queryClient.setQueryData<Character>(
        queryKeys.character(args.id),
        (old) => (old ? { ...old, ...(data as Partial<Character>) } : old),
      );
    },
    onError: (e) => handleError(e, t),
  });
}

export function useDeleteCharacterMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      handleElysia(await rpc.api.rp.characters({ id }).delete()),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<Character[]>(queryKeys.characters(), (old) =>
        old?.filter((it) => it.id !== id),
      );
      queryClient.removeQueries({ queryKey: queryKeys.character(id) });
    },
    onError: (e) => handleError(e, t),
  });
}

export function useImportCharacterCardMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) =>
      handleElysia(await rpc.api.rp.characters.import.post({ file })),
    onSuccess: (data) => {
      queryClient.setQueryData<Character[]>(queryKeys.characters(), (old) =>
        old ? [...old, data as Character] : [data as Character],
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

export function usePersonaQuery(id?: string) {
  return useQuery({
    queryKey: queryKeys.persona(id!),
    queryFn: async () =>
      handleElysia(await rpc.api.rp.personas({ id: id! }).get()),
    enabled: !!id,
  });
}

export function useCreatePersonaMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.rp.personas, "post">,
    ) => handleElysia(await rpc.api.rp.personas.post(args.body)),
    onSuccess: (data) => {
      queryClient.setQueryData<Persona[]>(queryKeys.personas(), (old) =>
        old ? [...old, data as Persona] : [data as Persona],
      );
    },
    onError: (e) => handleError(e, t),
  });
}

export function useUpdatePersonaMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      body: EdenArgs<
        ReturnType<typeof rpc.api.rp.personas>,
        "put"
      >["body"];
    }) =>
      handleElysia(await rpc.api.rp.personas({ id: args.id }).put(args.body)),
    onSuccess: (data, args) => {
      queryClient.setQueryData<Persona[]>(queryKeys.personas(), (old) =>
        old?.map((it) =>
          it.id === args.id ? { ...it, ...(data as Partial<Persona>) } : it,
        ),
      );
      queryClient.setQueryData<Persona>(queryKeys.persona(args.id), (old) =>
        old ? { ...old, ...(data as Partial<Persona>) } : old,
      );
    },
    onError: (e) => handleError(e, t),
  });
}

export function useDeletePersonaMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      handleElysia(await rpc.api.rp.personas({ id }).delete()),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<Persona[]>(queryKeys.personas(), (old) =>
        old?.filter((it) => it.id !== id),
      );
      queryClient.removeQueries({ queryKey: queryKeys.persona(id) });
    },
    onError: (e) => handleError(e, t),
  });
}

export function useImportPersonaMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) =>
      handleElysia(await rpc.api.rp.personas.import.post({ file })),
    onSuccess: (data) => {
      const list = (data as Persona[]) ?? [];
      queryClient.setQueryData<Persona[]>(queryKeys.personas(), (old) => {
        const next = [...(old ?? [])];
        for (const item of list) next.push(item);
        return next;
      });
    },
    onError: (e) => handleError(e, t),
  });
}

// ---------------------------------------------------------------------------
// Lorebooks (+ entries)
// ---------------------------------------------------------------------------

type LorebooksList = ListResponse<typeof rpc.api.rp.lorebooks.get>;
type Lorebook = LorebooksList extends ReadonlyArray<infer Item>
  ? Item
  : never;
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.rp.lorebooks, "post">,
    ) => handleElysia(await rpc.api.rp.lorebooks.post(args.body)),
    onSuccess: (data) => {
      queryClient.setQueryData<Lorebook[]>(queryKeys.lorebooks(), (old) =>
        old ? [...old, data as Lorebook] : [data as Lorebook],
      );
    },
    onError: (e) => handleError(e, t),
  });
}

export function useUpdateLorebookMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      body: EdenArgs<
        ReturnType<typeof rpc.api.rp.lorebooks>,
        "put"
      >["body"];
    }) =>
      handleElysia(await rpc.api.rp.lorebooks({ id: args.id }).put(args.body)),
    onSuccess: (data, args) => {
      queryClient.setQueryData<Lorebook[]>(queryKeys.lorebooks(), (old) =>
        old?.map((it) =>
          it.id === args.id ? { ...it, ...(data as Partial<Lorebook>) } : it,
        ),
      );
      queryClient.setQueryData<LorebookDetail>(
        queryKeys.lorebook(args.id),
        (old) => (old ? { ...old, ...(data as Partial<LorebookDetail>) } : old),
      );
    },
    onError: (e) => handleError(e, t),
  });
}

export function useDeleteLorebookMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      handleElysia(await rpc.api.rp.lorebooks({ id }).delete()),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<Lorebook[]>(queryKeys.lorebooks(), (old) =>
        old?.filter((it) => it.id !== id),
      );
      queryClient.removeQueries({ queryKey: queryKeys.lorebook(id) });
    },
    onError: (e) => handleError(e, t),
  });
}

export function useImportLorebookMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) =>
      handleElysia(await rpc.api.rp.lorebooks.import.post({ file })),
    onSuccess: (data) => {
      queryClient.setQueryData<Lorebook[]>(queryKeys.lorebooks(), (old) =>
        old ? [...old, data as Lorebook] : [data as Lorebook],
      );
    },
    onError: (e) => handleError(e, t),
  });
}

export function useCreateLorebookEntryMutation(lorebookId: string) {
  const t = useTranslations();
  const queryClient = useQueryClient();
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
      queryClient.setQueryData<LorebookDetail>(
        queryKeys.lorebook(lorebookId),
        (old) => {
          if (!old) return old;
          return { ...old, entries: [...old.entries, data as LorebookEntry] };
        },
      );
    },
    onError: (e) => handleError(e, t),
  });
}

export function useUpdateLorebookEntryMutation(lorebookId: string) {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      entryId: string;
      body: EdenArgs<
        ReturnType<
          ReturnType<typeof rpc.api.rp.lorebooks>["entries"]
        >,
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
      queryClient.setQueryData<LorebookDetail>(
        queryKeys.lorebook(lorebookId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            entries: old.entries.map((e) =>
              e.id === args.entryId
                ? { ...e, ...(data as Partial<LorebookEntry>) }
                : e,
            ),
          };
        },
      );
    },
    onError: (e) => handleError(e, t),
  });
}

export function useDeleteLorebookEntryMutation(lorebookId: string) {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entryId: string) =>
      handleElysia(
        await rpc.api.rp
          .lorebooks({ id: lorebookId })
          .entries({ entryId })
          .delete(),
      ),
    onSuccess: (_data, entryId) => {
      queryClient.setQueryData<LorebookDetail>(
        queryKeys.lorebook(lorebookId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            entries: old.entries.filter((e) => e.id !== entryId),
          };
        },
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

export function usePresetQuery(id?: string) {
  return useQuery({
    queryKey: queryKeys.preset(id!),
    queryFn: async () =>
      handleElysia(await rpc.api.rp.presets({ id: id! }).get()),
    enabled: !!id,
  });
}

export function useCreatePresetMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.rp.presets, "post">,
    ) => handleElysia(await rpc.api.rp.presets.post(args.body)),
    onSuccess: (data) => {
      queryClient.setQueryData<Preset[]>(queryKeys.presets(), (old) =>
        old ? [...old, data as Preset] : [data as Preset],
      );
    },
    onError: (e) => handleError(e, t),
  });
}

export function useUpdatePresetMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      body: EdenArgs<
        ReturnType<typeof rpc.api.rp.presets>,
        "put"
      >["body"];
    }) =>
      handleElysia(await rpc.api.rp.presets({ id: args.id }).put(args.body)),
    onSuccess: (data, args) => {
      queryClient.setQueryData<Preset[]>(queryKeys.presets(), (old) =>
        old?.map((it) =>
          it.id === args.id ? { ...it, ...(data as Partial<Preset>) } : it,
        ),
      );
      queryClient.setQueryData<Preset>(queryKeys.preset(args.id), (old) =>
        old ? { ...old, ...(data as Partial<Preset>) } : old,
      );
    },
    onError: (e) => handleError(e, t),
  });
}

export function useDeletePresetMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      handleElysia(await rpc.api.rp.presets({ id }).delete()),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<Preset[]>(queryKeys.presets(), (old) =>
        old?.filter((it) => it.id !== id),
      );
      queryClient.removeQueries({ queryKey: queryKeys.preset(id) });
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      convId: string;
      body: EdenArgs<
        ReturnType<typeof rpc.api.rp.conversations>["settings"],
        "put"
      >["body"];
    }) =>
      handleElysia(
        await rpc.api.rp.conversations({ id: args.convId }).settings.put(args.body),
      ),
    onSuccess: (data, args) => {
      queryClient.setQueryData<ChatSettings>(
        queryKeys.chatSettings(args.convId),
        (old) => (old ? { ...old, ...(data as Partial<ChatSettings>) } : (data as ChatSettings)),
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      convId: string;
      body: EdenArgs<
        ReturnType<typeof rpc.api.rp.conversations>["bindings"],
        "put"
      >["body"];
    }) =>
      handleElysia(
        await rpc.api.rp.conversations({ id: args.convId }).bindings.put(args.body),
      ),
    onSuccess: (data, args) => {
      queryClient.setQueryData<ChatBindings>(
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
  return useMutation({
    mutationFn: async (file: File) =>
      handleElysia(
        await rpc.api.rp.conversations.import.post({ file }),
      ),
    // The created conversation lands in the conversations list as soon as the
    // user opens the sidebar; we don't have its full ConvItem shape here, so
    // there's nothing to patch optimistically. The list query refetches on
    // mount, which is fine for an import action.
    onError: (e) => handleError(e, t),
  });
}
