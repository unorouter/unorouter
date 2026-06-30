"use client";

import { useLocalUserId } from "@/hooks/auth/use-local-user-id";
import { useApiMutation } from "@/lib/react-query/hooks";
import { msg, NATIVE_VERSION, ORPG_VERSION } from "@/lib/config/constants";
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
import type { NativeImport, OrpgImport } from "@/lib/types";
import type {
  UpdateConversationBindingsBody,
  UpdateConversationSettingsBody,
} from "@/lib/validation/chat";
import type { ConversationExportFormat } from "@/lib/validation/rp";
import { useQuery } from "@tanstack/react-query";
import { dayjs } from "@/lib/utils/format/date";

export function useChatSettingsQuery(convId?: string) {
  const userId = useLocalUserId();
  return useQuery({
    queryKey: queryKeys.chatSettings(convId!),
    queryFn: async () => {
      if (!convId) return null;
      return (await readLocalConversationSettings(userId, convId)) ?? null;
    },
    enabled: !!convId,
  });
}

export function useUpdateChatSettingsMutation() {
  const userId = useLocalUserId();
  return useApiMutation({
    mutationFn: async (args: {
      convId: string;
      body: UpdateConversationSettingsBody;
    }) => {
      const existing = await readLocalConversationSettings(userId, args.convId);
      const now = dayjs().toDate();
      const updated = {
        ...(existing ?? { convId: args.convId, defaultModel: "" }),
        ...args.body,
        convId: args.convId,
        updatedAt: now,
      };
      // Settings live on the conversation row; this upsert also bumps updatedAt.
      await upsertLocalConversationSettings(userId, updated);
      return updated;
    },
    invalidates: (args) => [queryKeys.chatSettings(args.convId)],
  });
}

export function useChatBindingsQuery(convId?: string) {
  const userId = useLocalUserId();
  return useQuery({
    queryKey: queryKeys.chatBindings(convId!),
    queryFn: async () => {
      if (!convId) throw new Error("not-found");
      const local = await readLocalConversationBindings(userId, convId);
      return {
        characters: local?.conversationCharacters ?? [],
        lorebooks: local?.conversationLorebooks ?? [],
      };
    },
    enabled: !!convId,
  });
}

export function useUpdateChatBindingsMutation() {
  const userId = useLocalUserId();
  return useApiMutation({
    mutationFn: async (args: {
      convId: string;
      body: UpdateConversationBindingsBody;
    }) => {
      await replaceLocalConversationBindings(userId, args.convId, {
        conversationCharacters: args.body.characters ?? [],
        conversationLorebooks: (args.body.lorebookIds ?? []).map((lid) => ({
          lorebookId: lid,
        })),
      });
      const now = dayjs().toDate();
      const conv = await readLocalConversation(userId, args.convId);
      if (conv) {
        await upsertLocalConversation(userId, {
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
  const userId = useLocalUserId();

  return useApiMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();

      // ST JSONL is line-delimited; detect before JSON.parse.
      if (looksLikeSillyTavernChat(text)) {
        return importSillyTavernChat(userId, text);
      }

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error(msg("ERRORS.IMPORT_INVALID_JSON"));
      }

      // Untrusted JSON; one boundary cast, envelopes optional fields.
      if (parsed.version === NATIVE_VERSION) {
        return persistMappedImport(
          userId,
          mapNativeImport(parsed as NativeImport),
        );
      }
      // orpg.3.0 (openrouter): lossy on lorebooks/personas.
      if (parsed.version === ORPG_VERSION) {
        return persistMappedImport(userId, mapOrpgImport(parsed as OrpgImport));
      }
      throw new Error(msg("ERRORS.IMPORT_UNSUPPORTED_VERSION"));
    },
    invalidates: [queryKeys.conversations()],
  });
}

export function useExportConversation() {
  const userId = useLocalUserId();
  return useApiMutation({
    mutationFn: async (args: {
      convId: string;
      format: ConversationExportFormat;
    }) => {
      const native = await buildNativeExport(userId, args.convId);
      return args.format === "orpg" ? toOrpg(native) : native;
    },
  });
}

// Fork a chat from a message into a new conversation (clone up to that message, same bound entities).
export function useForkConversationMutation() {
  const userId = useLocalUserId();
  return useApiMutation({
    mutationFn: (args: { convId: string; messageId: string }) =>
      forkConversationFromMessage(userId, args.convId, args.messageId),
    invalidates: [queryKeys.conversations()],
  });
}
