"use client";

import { useAuthQuery } from "@/hooks/auth-hook";
import {
  readLocalCard,
  readLocalConversationBundle,
  readLocalGenerationSessionBundle,
  readLocalLorebook,
} from "@/lib/local-db/reads";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { handleError } from "@/lib/utils/client";
import type { SyncKindName } from "@/lib/validation/sync";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

// ---------------------------------------------------------------------------
// Sync hooks. Three generic mutations cover every Group A entity:
// `useSyncMutation` (Add + Resync, idempotent POST), `useRemoveSyncMutation`,
// plus a `useSyncStateQuery` for hydration and per-row badge reads.
// Each mutation is parameterized by `kind`; consumers pass the entity body
// as `payload` so the server can upsert from a missing/stale state.
// ---------------------------------------------------------------------------

export function useSyncStateQuery() {
  return useQuery({
    queryKey: queryKeys.syncState(),
    queryFn: async () => handleElysia(await rpc.api.sync.state.get()),
    staleTime: 60_000,
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
      // For kinds w/ cascade children, auto-build the bundle from SQLocal so
      // Add/Resync pushes everything (settings, bindings, messages, items,
      // media for conversations; lorebook + entries; card + junctions;
      // session + generations + images + likes). Caller's explicit payload
      // wins when provided.
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
              card: { ...card, cardCharacters: undefined, cardLorebooks: undefined },
              cardCharacters: card.cardCharacters,
              cardLorebooks: card.cardLorebooks,
            };
          }
        } else if (args.kind === "generationSessions") {
          payload = await readLocalGenerationSessionBundle(userId, args.id);
        }
      }
      return handleElysia(
        await rpc.api.sync({ kind: args.kind })({ id: args.id }).post({
          days: args.days,
          payload,
          keepExpiry: args.keepExpiry,
        }),
      );
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
  return useMutation({
    mutationFn: async (args: RemoveArgs) =>
      handleElysia(
        await rpc.api.sync({ kind: args.kind })({ id: args.id }).delete(),
      ),
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
