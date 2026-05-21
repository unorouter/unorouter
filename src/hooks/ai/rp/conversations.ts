"use client";

import { useAuthQuery } from "@/hooks/auth/auth-hook";
import {
  GUEST_USER_ID,
  msg,
  NATIVE_VERSION,
  ORPG_VERSION,
} from "@/lib/config/constants";
import {
  readLocalConversation,
  readLocalConversationBindings,
  readLocalConversationSettings,
  replaceLocalConversationBindings,
  upsertLocalConversation,
  upsertLocalConversationSettings,
} from "@/lib/db/client/data/chat";
import {
  buildNativeExport,
  persistMappedImport,
  toOrpg,
} from "@/lib/db/client/data/transfer/native";
import {
  mapNativeImport,
  mapOrpgImport,
} from "@/lib/db/client/data/transfer/map";
import {
  importSillyTavernChat,
  looksLikeSillyTavernChat,
} from "@/lib/db/client/data/transfer/sillytavern";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenArgs } from "@/lib/types/eden";
import type { NativeImport, OrpgImport } from "@/lib/types/transfer";
import { handleError } from "@/lib/utils/client";
import type { ConversationExportFormat } from "@/lib/validation/rp";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dayjs } from "@/lib/utils/format/date";
import { useTranslations } from "next-intl";
import { mirrorConvIfSynced } from "./shared";

export function useChatSettingsQuery(convId?: string) {
  const auth = useAuthQuery();
  return useQuery({
    queryKey: queryKeys.chatSettings(convId!),
    queryFn: async () => {
      const userId = auth.data?.id ?? GUEST_USER_ID;
      if (!convId) throw new Error("not-found");
      const local = await readLocalConversationSettings(userId, convId);
      if (!local) throw new Error("not-found");
      return local;
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
        ReturnType<typeof rpc.api.ai.rp.conversations>["settings"],
        "put"
      >["body"];
    }) => {
      const userId = auth.data?.id ?? GUEST_USER_ID;
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
    onSuccess: (_data, args) => {
      qc.invalidateQueries({ queryKey: queryKeys.chatSettings(args.convId) });
    },
    onError: (e) => handleError(e, t),
  });
}

export function useChatBindingsQuery(convId?: string) {
  const auth = useAuthQuery();
  return useQuery({
    queryKey: queryKeys.chatBindings(convId!),
    queryFn: async () => {
      const userId = auth.data?.id ?? GUEST_USER_ID;
      if (!convId) throw new Error("not-found");
      const local = await readLocalConversationBindings(userId, convId);
      // Surface server shape ({ characters, lorebooks }), not the local
      // column names (`conversationCharacters` / `conversationLorebooks`).
      return {
        characters: local?.conversationCharacters ?? [],
        lorebooks: local?.conversationLorebooks ?? [],
      };
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
        ReturnType<typeof rpc.api.ai.rp.conversations>["bindings"],
        "put"
      >["body"];
    }) => {
      await replaceLocalConversationBindings(auth.data?.id, args.convId, {
        conversationCharacters: args.body.characters ?? [],
        conversationLorebooks: (args.body.lorebookIds ?? []).map((lid) => ({
          lorebookId: lid,
        })),
      });
      const now = dayjs().toDate();
      const conv = await readLocalConversation(auth.data?.id, args.convId);
      if (conv) {
        await upsertLocalConversation(auth.data?.id, {
          ...conv,
          updatedAt: now,
        });
      }
      await mirrorConvIfSynced(auth.data?.id, args.convId);
      return { id: args.convId };
    },
    onSuccess: (_data, args) => {
      qc.invalidateQueries({ queryKey: queryKeys.chatBindings(args.convId) });
    },
    onError: (e) => handleError(e, t),
  });
}

export function useImportConversationMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();

  return useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();

      // ST JSONL is line-delimited; detect before JSON.parse.
      if (looksLikeSillyTavernChat(text)) {
        return importSillyTavernChat(auth.data?.id, text);
      }

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error(msg("ERRORS.IMPORT_INVALID_JSON"));
      }

      // Untrusted JSON: one boundary cast, the envelope types make every
      // field optional so downstream access stays sound.
      if (parsed.version === NATIVE_VERSION) {
        return persistMappedImport(
          auth.data?.id,
          mapNativeImport(parsed as NativeImport),
        );
      }
      // orpg.3.0 (openrouter): lossy on lorebooks/personas.
      if (parsed.version === ORPG_VERSION) {
        return persistMappedImport(
          auth.data?.id,
          mapOrpgImport(parsed as OrpgImport),
        );
      }
      throw new Error(msg("ERRORS.IMPORT_UNSUPPORTED_VERSION"));
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.conversations() }),
    onError: (e) => handleError(e, t),
  });
}

export function useExportConversation() {
  const t = useTranslations();
  const auth = useAuthQuery();
  return useMutation({
    onError: (e) => handleError(e, t),
    mutationFn: async (args: {
      convId: string;
      format: ConversationExportFormat;
    }) => {
      const native = await buildNativeExport(auth.data?.id, args.convId);
      return args.format === "orpg" ? toOrpg(native) : native;
    },
  });
}
