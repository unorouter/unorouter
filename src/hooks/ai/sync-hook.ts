"use client";

import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { readLocalCard, readLocalLorebook } from "@/lib/db/client/data/rp";
import {
  readLocalConversation,
  readLocalConversationBundle,
  upsertLocalConversation,
} from "@/lib/db/client/data/chat";
import { readLocalGenerationSessionBundle } from "@/lib/db/client/data/playground";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { handleError } from "@/lib/utils/client";
import type { SyncKindName } from "@/lib/validation/sync";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

function useSyncStateQuery() {
  return useQuery({
    queryKey: queryKeys.syncState(),
    queryFn: async () => handleElysia(await rpc.api.ai.sync.state.get()),
    enabled: false,
  });
}

type SyncArgs = {
  kind: SyncKindName;
  id: string;
  payload?: unknown;
  days?: number;
  /** Mirror PATCH on save: refresh content w/o resetting the 30-day window. */
  keepExpiry?: boolean;
};

export function useSyncMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (args: SyncArgs) => {
      let payload = args.payload;
      const userId = auth.data?.id;
      // Auto-build cascade bundle from SQLocal so Add/Resync pushes children
      // (settings, bindings, messages, items, media for conversations; entries
      // for lorebooks; junctions for cards; playgrounds/images/likes for
      // sessions). Explicit payload wins.
      if (payload == null && userId != null) {
        if (args.kind === "conversations") {
          payload = await readLocalConversationBundle(userId, args.id);
        } else if (args.kind === "lorebooks") {
          const lb = await readLocalLorebook(userId, args.id);
          if (lb) {
            payload = {
              lorebook: { ...lb, entries: undefined },
              entries: lb.entries,
            };
          }
        } else if (args.kind === "cards") {
          const card = await readLocalCard(userId, args.id);
          if (card) {
            payload = {
              card: {
                ...card,
                cardCharacters: undefined,
                cardLorebooks: undefined,
              },
              cardCharacters: card.cardCharacters,
              cardLorebooks: card.cardLorebooks,
            };
          }
        } else if (args.kind === "playgroundSessions") {
          payload = await readLocalGenerationSessionBundle(userId, args.id);
        }
      }
      const result = handleElysia(
        await rpc.api.ai.sync({ kind: args.kind })({ id: args.id }).post({
          days: args.days,
          payload,
          keepExpiry: args.keepExpiry,
        }),
      );

      // Mirror the server-assigned expiry onto the local conversation row so
      // local-first checks (resync, auto-mirror on edit) see it as synced.
      // The sync POST returns the synced bundle; for conversations it carries
      // the conversation row with the new syncExpiresAt.
      if (args.kind === "conversations" && userId != null) {
        const bundle = result as {
          conversation?: { syncExpiresAt?: string | number | null };
        };
        const expiry = bundle.conversation?.syncExpiresAt;
        if (expiry != null) {
          const existing = await readLocalConversation(userId, args.id);
          if (existing) {
            await upsertLocalConversation(userId, {
              ...existing,
              syncExpiresAt: new Date(expiry),
            });
          }
        }
      }
      return result;
    },
    onError: (e) => handleError(e, t),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.syncState() });
    },
  });
}

type RemoveArgs = { kind: SyncKindName; id: string };

export function useRemoveSyncMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (args: RemoveArgs) => {
      const result = handleElysia(
        await rpc.api.ai.sync({ kind: args.kind })({ id: args.id }).delete(),
      );
      // Clear the local syncExpiresAt so the conversation reads as not-synced.
      const userId = auth.data?.id;
      if (args.kind === "conversations" && userId != null) {
        const existing = await readLocalConversation(userId, args.id);
        if (existing) {
          await upsertLocalConversation(userId, {
            ...existing,
            syncExpiresAt: null,
          });
        }
      }
      return result;
    },
    onError: (e) => handleError(e, t),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.syncState() });
    },
  });
}

// Reads the current syncExpiresAt for one row from the bulk sync-state cache
// so consumers (SyncBadge) don't fan out N independent queries.
export function useSyncStateForRow(kind: SyncKindName, id: string) {
  const query = useSyncStateQuery();
  const row = query.data?.[kind]?.find((r) => r.id === id);
  return {
    isLoaded: query.isSuccess,
    syncExpiresAt: row?.syncExpiresAt ?? null,
  };
}
