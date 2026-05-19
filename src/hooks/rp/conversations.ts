"use client";

import { useAuthQuery } from "@/hooks/auth-hook";
import {
  readLocalConversation,
  readLocalConversationBindings,
  readLocalConversationSettings,
} from "@/lib/db/client/reads";
import {
  replaceLocalConversationBindings,
  upsertLocalConversation,
  upsertLocalConversationSettings,
} from "@/lib/db/client/writes";
import { itemPatch } from "@/lib/react-query/cache-helpers";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenArgs, EdenResponse } from "@/lib/types/eden";
import { handleElysia } from "@/lib/utils/base";
import { handleError } from "@/lib/utils/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { mirrorConvIfSynced } from "./shared";

export type ChatSettings = EdenResponse<
  ReturnType<typeof rpc.api.rp.conversations>["settings"],
  "get"
>;

export type ChatBindings = EdenResponse<
  ReturnType<typeof rpc.api.rp.conversations>["bindings"],
  "get"
>;

export function useChatSettingsQuery(convId?: string) {
  const auth = useAuthQuery();
  return useQuery({
    queryKey: queryKeys.chatSettings(convId!),
    queryFn: async () => {
      const userId = auth.data?.id ?? 0;
      if (!convId) throw new Error("not-found");
      const local = await readLocalConversationSettings(userId, convId);
      if (!local) throw new Error("not-found");
      return local as unknown as ChatSettings;
    },
    enabled: !!convId,
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
      const userId = auth.data?.id ?? 0;
      const existing = await readLocalConversationSettings(userId, args.convId);
      const now = dayjs().toDate();
      const updated = {
        ...(existing ?? { convId: args.convId, defaultModel: "" }),
        ...args.body,
        convId: args.convId,
        updatedAt: now,
      };
      await upsertLocalConversationSettings(userId, updated);

      const conv = await readLocalConversation(userId, args.convId);
      if (conv) {
        await upsertLocalConversation(userId, { ...conv, updatedAt: now });
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
      const userId = auth.data?.id ?? 0;
      if (!convId) throw new Error("not-found");
      const local = await readLocalConversationBindings(userId, convId);
      // Surface server shape ({ characters, lorebooks }), not the local
      // column names (`conversationCharacters` / `conversationLorebooks`).
      return {
        characters: local?.conversationCharacters ?? [],
        lorebooks: local?.conversationLorebooks ?? [],
      } as unknown as ChatBindings;
    },
    enabled: !!convId,
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
      const userId = auth.data?.id ?? 0;
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
