"use client";

import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { useApiMutation } from "@/hooks/use-api-mutation";
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
import type { NativeImport, OrpgImport } from "@/lib/types/transfer";
import type {
  UpdateConversationBindingsBody,
  UpdateConversationSettingsBody,
} from "@/lib/validation/chat";
import type { ConversationExportFormat } from "@/lib/validation/rp";
import { useQuery } from "@tanstack/react-query";
import { dayjs } from "@/lib/utils/format/date";
import {
  mirrorConvBindingsIfSynced,
  mirrorConvRowIfSynced,
} from "@/lib/db/client/sync/mirror";

export function useChatSettingsQuery(convId?: string) {
  const auth = useAuthQuery();
  return useQuery({
    queryKey: queryKeys.chatSettings(convId!),
    queryFn: async () => {
      const userId = auth.data?.id ?? GUEST_USER_ID;
      if (!convId) return null;
      return (await readLocalConversationSettings(userId, convId)) ?? null;
    },
    enabled: !!convId,
  });
}

export function useUpdateChatSettingsMutation() {
  const auth = useAuthQuery();
  return useApiMutation({
    mutationFn: async (args: {
      convId: string;
      body: UpdateConversationSettingsBody;
      // Drawer save pairs settings + bindings; lets caller mirror once after.
      skipMirror?: boolean;
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
      // Settings live on the conversation row; this upsert also bumps updatedAt.
      await upsertLocalConversationSettings(userId, updated);
      if (!args.skipMirror) {
        // Settings are conversation-row columns; patch them instead of
        // re-uploading the whole conversation bundle on every drawer save.
        await mirrorConvRowIfSynced(userId, args.convId);
      }
      return updated;
    },
    invalidates: (args) => [queryKeys.chatSettings(args.convId)],
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
      // Surface server keys (characters/lorebooks).
      return {
        characters: local?.conversationCharacters ?? [],
        lorebooks: local?.conversationLorebooks ?? [],
      };
    },
    enabled: !!convId,
  });
}

export function useUpdateChatBindingsMutation() {
  const auth = useAuthQuery();
  return useApiMutation({
    mutationFn: async (args: {
      convId: string;
      body: UpdateConversationBindingsBody;
      skipMirror?: boolean;
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
      if (!args.skipMirror) {
        // Join tables only; messages/media never ride a bindings save.
        await mirrorConvBindingsIfSynced(auth.data?.id, args.convId);
      }
      return { id: args.convId };
    },
    invalidates: (args) => [queryKeys.chatBindings(args.convId)],
  });
}

export function useImportConversationMutation() {
  const auth = useAuthQuery();

  return useApiMutation({
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

      // Untrusted JSON; one boundary cast, envelopes optional fields.
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
    invalidates: [queryKeys.conversations()],
  });
}

export function useExportConversation() {
  const auth = useAuthQuery();
  return useApiMutation({
    mutationFn: async (args: {
      convId: string;
      format: ConversationExportFormat;
    }) => {
      const native = await buildNativeExport(auth.data?.id, args.convId);
      return args.format === "orpg" ? toOrpg(native) : native;
    },
  });
}
