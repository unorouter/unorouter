"use client";

import { useLocalUserId } from "@/hooks/auth/use-local-user-id";
import { invalidateAndBroadcast } from "@/lib/react-query/cross-tab-invalidate";
import { queryKeys } from "@/lib/react-query/keys";
import { uid } from "@/lib/utils/base";
import { handleError } from "@/lib/utils/client";
import type { RpSyncKind } from "@/lib/validation/sync-constants";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dayjs } from "@/lib/utils/format/date";
import { useTranslations } from "next-intl";
import { mirrorSyncedRow, unmirrorIfSynced } from "@/lib/db/client/sync/mirror";
type WithId = { id: string; syncExpiresAt?: Date | null };

type EntityHooks<TItem extends WithId, TCreateBody, TUpdateBody, TDetail> = {
  useList: () => ReturnType<typeof useQuery<TItem[]>>;
  useItem: (id: string | undefined) => ReturnType<typeof useQuery<TDetail>>;
  useCreate: () => ReturnType<
    typeof useMutation<TItem, Error, { body: TCreateBody }>
  >;
  useUpdate: () => ReturnType<
    typeof useMutation<TItem, Error, { id: string; body: TUpdateBody }>
  >;
  useDelete: () => ReturnType<
    typeof useMutation<{ id: string }, Error, string>
  >;
};

export function makeRpEntity<
  TItem extends WithId,
  TCreateBody,
  TUpdateBody,
  // Detail row from readItem may be richer than the list row (lorebook + entries).
  TDetail extends WithId = TItem,
>(opts: {
  syncKind: RpSyncKind;
  listKey: () => readonly unknown[];
  itemKey: (id: string) => readonly unknown[];
  readList: (userId: number) => Promise<TItem[] | null>;
  readItem: (userId: number, id: string) => Promise<TDetail | null>;
  upsertLocal: (userId: number, row: TItem) => Promise<void>;
  deleteLocal: (userId: number, id: string) => Promise<void>;
}): EntityHooks<TItem, TCreateBody, TUpdateBody, TDetail> {
  return {
    useList: () => {
      const userId = useLocalUserId();
      return useQuery({
        queryKey: opts.listKey() as readonly unknown[] as string[],
        queryFn: async () =>
          ((await opts.readList(userId)) ?? []) as TItem[],
      });
    },

    useItem: (id: string | undefined) => {
      const userId = useLocalUserId();
      return useQuery({
        queryKey: opts.itemKey(id ?? "") as readonly unknown[] as string[],
        queryFn: async () => {
          if (!id) throw new Error("not-found");
          const item = await opts.readItem(userId, id);
          if (!item) throw new Error("not-found");
          return item;
        },
        enabled: !!id,
      });
    },

    useCreate: () => {
      const t = useTranslations();
      const qc = useQueryClient();
      const userId = useLocalUserId();
      return useMutation({
        mutationFn: async (args: { body: TCreateBody }) => {
          const now = dayjs().toDate();
          const row = {
            ...args.body,
            id: uid(),
            userId,
            syncExpiresAt: null,
            createdAt: now,
            updatedAt: now,
          } as unknown as TItem;
          await opts.upsertLocal(userId, row);
          return row;
        },
        onSuccess: () => {
          invalidateAndBroadcast(qc, [opts.listKey() as string[]]);
        },
        onError: (e) => handleError(e, t),
      });
    },

    useUpdate: () => {
      const t = useTranslations();
      const qc = useQueryClient();
      const userId = useLocalUserId();
      return useMutation({
        mutationFn: async (args: { id: string; body: TUpdateBody }) => {
          const existing = await opts.readItem(userId, args.id);
          if (!existing) throw new Error("not-found");
          const now = dayjs().toDate();
          const updated = {
            ...existing,
            ...args.body,
            updatedAt: now,
          } as unknown as TItem;
          await opts.upsertLocal(userId, updated);
          if (existing.syncExpiresAt != null) {
            await mirrorSyncedRow(userId, opts.syncKind, args.id);
          }
          return updated;
        },
        onSuccess: (_data, args) => {
          invalidateAndBroadcast(qc, [
            opts.listKey() as string[],
            opts.itemKey(args.id) as string[],
          ]);
        },
        onError: (e) => handleError(e, t),
      });
    },

    useDelete: () => {
      const t = useTranslations();
      const qc = useQueryClient();
      const userId = useLocalUserId();
      return useMutation({
        mutationFn: async (id: string) => {
          const existing = await opts.readItem(userId, id);
          const wasSynced = existing?.syncExpiresAt != null;
          await opts.deleteLocal(userId, id);
          await unmirrorIfSynced(userId, opts.syncKind, id, wasSynced);
          return { id };
        },
        onSuccess: (_data, id) => {
          qc.removeQueries({ queryKey: opts.itemKey(id) as string[] });
          invalidateAndBroadcast(qc, [
            opts.listKey() as string[],
            queryKeys.syncState(),
          ]);
        },
        onError: (e) => handleError(e, t),
      });
    },
  };
}
