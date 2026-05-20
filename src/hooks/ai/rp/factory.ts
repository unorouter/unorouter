"use client";

import { GUEST_USER_ID } from "@/lib/config/constants";

import { useAuthQuery } from "@/hooks/auth/auth-hook";
import {
  itemPatch,
  listAdd,
  listRemove,
  listUpdate,
} from "@/lib/react-query/cache-helpers";
import { queryKeys } from "@/lib/react-query/keys";
import { uid } from "@/lib/utils/base";
import { handleError } from "@/lib/utils/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { deleteSyncedRow, mirrorSyncedRow, type RpSyncKind } from "./shared";

type WithId = { id: string; syncExpiresAt?: Date | null };

export type EntityHooks<TItem extends WithId, TCreateBody, TUpdateBody> = {
  useList: () => ReturnType<typeof useQuery<TItem[]>>;
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
>(opts: {
  syncKind: RpSyncKind;
  listKey: () => readonly unknown[];
  itemKey: (id: string) => readonly unknown[];
  readList: (userId: number) => Promise<TItem[] | null>;
  readItem: (userId: number, id: string) => Promise<TItem | null>;
  upsertLocal: (userId: number, row: TItem) => Promise<void>;
  deleteLocal: (userId: number, id: string) => Promise<void>;
}): EntityHooks<TItem, TCreateBody, TUpdateBody> {
  return {
    useList: () => {
      const auth = useAuthQuery();
      return useQuery({
        queryKey: opts.listKey() as readonly unknown[] as string[],
        queryFn: async () => {
          const userId = auth.data?.id ?? GUEST_USER_ID;
          return ((await opts.readList(userId)) ?? []) as TItem[];
        },
      });
    },

    useCreate: () => {
      const t = useTranslations();
      const qc = useQueryClient();
      const auth = useAuthQuery();
      return useMutation({
        mutationFn: async (args: { body: TCreateBody }) => {
          const userId = auth.data?.id ?? GUEST_USER_ID;
          const now = dayjs().toDate();
          const row = {
            ...(args.body as object),
            id: uid(),
            userId,
            syncExpiresAt: null,
            createdAt: now,
            updatedAt: now,
          } as unknown as TItem;
          await opts.upsertLocal(userId, row);
          return row;
        },
        onSuccess: (data) => {
          qc.setQueryData<TItem[]>(opts.listKey() as string[], (old) =>
            listAdd(old, data),
          );
        },
        onError: (e) => handleError(e, t),
      });
    },

    useUpdate: () => {
      const t = useTranslations();
      const qc = useQueryClient();
      const auth = useAuthQuery();
      return useMutation({
        mutationFn: async (args: { id: string; body: TUpdateBody }) => {
          const userId = auth.data?.id ?? GUEST_USER_ID;
          const existing = await opts.readItem(userId, args.id);
          if (!existing) throw new Error("not-found");
          const now = dayjs().toDate();
          const updated = {
            ...existing,
            ...(args.body as object),
            updatedAt: now,
          } as TItem;
          await opts.upsertLocal(userId, updated);
          if (existing.syncExpiresAt != null) {
            await mirrorSyncedRow(userId, opts.syncKind, args.id, updated);
          }
          return updated;
        },
        onSuccess: (data, args) => {
          qc.setQueryData<TItem[]>(opts.listKey() as string[], (old) =>
            listUpdate(old as never, args.id, data as never),
          );
          qc.setQueryData<TItem>(opts.itemKey(args.id) as string[], (old) =>
            itemPatch(old, data as Partial<TItem>),
          );
        },
        onError: (e) => handleError(e, t),
      });
    },

    useDelete: () => {
      const t = useTranslations();
      const qc = useQueryClient();
      const auth = useAuthQuery();
      return useMutation({
        mutationFn: async (id: string) => {
          const userId = auth.data?.id ?? GUEST_USER_ID;
          const existing = await opts.readItem(userId, id);
          const wasSynced = existing?.syncExpiresAt != null;
          await opts.deleteLocal(userId, id);
          if (wasSynced) await deleteSyncedRow(userId, opts.syncKind, id);
          return { id };
        },
        onSuccess: (_data, id) => {
          qc.setQueryData<TItem[]>(opts.listKey() as string[], (old) =>
            listRemove(old as never, id),
          );
          qc.removeQueries({ queryKey: opts.itemKey(id) as string[] });
          qc.invalidateQueries({ queryKey: queryKeys.syncState() });
        },
        onError: (e) => handleError(e, t),
      });
    },
  };
}
