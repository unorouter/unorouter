"use client";

import { useApiMutation } from "@/lib/react-query/hooks";
import { isRecord } from "@/lib/utils/base";
import { msg, NATIVE_VERSION, ORPG_VERSION } from "@/lib/config/constants";
import {
  readLocalConversation,
  readLocalConversationBindings,
  readLocalConversationSettings,
  replaceLocalConversationBindings,
  upsertLocalConversation,
  upsertLocalConversationSettings,
} from "@/lib/db/client/data/chat/chat";
import {
  buildNativeExport,
  persistMappedImport,
  toOrpg,
} from "@/lib/db/client/data/transfer/native";
import { forkConversationFromMessage } from "@/lib/db/client/data/transfer/fork";
import {
  mapNativeImport,
  mapOrpgImport,
} from "@/lib/db/client/data/transfer/map";
import {
  importSillyTavernChat,
  looksLikeSillyTavernChat,
} from "@/lib/db/client/data/transfer/sillytavern";
import { queryKeys } from "@/lib/react-query/keys";
import type {
  UpdateConversationBindingsBody,
  UpdateConversationSettingsBody,
} from "@/lib/validation/chat";
import type { ConversationExportFormat } from "@/lib/validation/rp";
import { useQuery } from "@tanstack/react-query";
import { dayjs } from "@/lib/utils/format/date";

export function useChatSettingsQuery(convId?: string) {
  return useQuery({
    queryKey: queryKeys.chatSettings(convId!),
    queryFn: async () => {
      if (!convId) return null;
      return (await readLocalConversationSettings(convId)) ?? null;
    },
    enabled: !!convId,
  });
}

export function useUpdateChatSettingsMutation() {
  return useApiMutation({
    mutationFn: async (args: {
      convId: string;
      body: UpdateConversationSettingsBody;
    }) => {
      const existing = await readLocalConversationSettings(args.convId);
      const now = dayjs().toDate();
      const updated = {
        ...(existing ?? { convId: args.convId, defaultModel: "" }),
        ...args.body,
        convId: args.convId,
        updatedAt: now,
      };
      await upsertLocalConversationSettings(updated);
      return updated;
    },
    invalidates: (args) => [queryKeys.chatSettings(args.convId)],
  });
}

export function useChatBindingsQuery(convId?: string) {
  return useQuery({
    queryKey: queryKeys.chatBindings(convId!),
    queryFn: async () => {
      if (!convId) throw new Error("not-found");
      const local = await readLocalConversationBindings(convId);
      return {
        characters: local?.conversationCharacters ?? [],
        lorebooks: local?.conversationLorebooks ?? [],
      };
    },
    enabled: !!convId,
  });
}

export function useUpdateChatBindingsMutation() {
  return useApiMutation({
    mutationFn: async (args: {
      convId: string;
      body: UpdateConversationBindingsBody;
    }) => {
      await replaceLocalConversationBindings(args.convId, {
        conversationCharacters: args.body.characters ?? [],
        conversationLorebooks: (args.body.lorebookIds ?? []).map((lid) => ({
          lorebookId: lid,
        })),
      });
      const now = dayjs().toDate();
      const conv = await readLocalConversation(args.convId);
      if (conv) {
        await upsertLocalConversation({
          ...conv,
          updatedAt: now,
        });
      }
      return { id: args.convId };
    },
    invalidates: (args) => [queryKeys.chatBindings(args.convId)],
  });
}

export function useImportConversationMutation() {
  return useApiMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();

      if (looksLikeSillyTavernChat(text)) {
        return importSillyTavernChat(text);
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error(msg("ERRORS.IMPORT_INVALID_JSON"));
      }
      if (!isRecord(parsed)) {
        throw new Error(msg("ERRORS.IMPORT_INVALID_JSON"));
      }

      if (parsed.version === NATIVE_VERSION) {
        return persistMappedImport(mapNativeImport(parsed));
      }
      if (parsed.version === ORPG_VERSION) {
        return persistMappedImport(mapOrpgImport(parsed));
      }
      throw new Error(msg("ERRORS.IMPORT_UNSUPPORTED_VERSION"));
    },
    invalidates: [queryKeys.conversations()],
  });
}

export function useExportConversation() {
  return useApiMutation({
    mutationFn: async (args: {
      convId: string;
      format: ConversationExportFormat;
    }) => {
      const native = await buildNativeExport(args.convId);
      return args.format === "orpg" ? toOrpg(native) : native;
    },
  });
}

export function useForkConversationMutation() {
  return useApiMutation({
    mutationFn: (args: { convId: string; messageId: string }) =>
      forkConversationFromMessage(args.convId, args.messageId),
    invalidates: [queryKeys.conversations()],
  });
}
