"use client";

import { invalidateAndBroadcast } from "@/lib/react-query/cross-tab-invalidate";
import { uid } from "@/lib/utils/base";
import { handleError } from "@/lib/utils/client";
import { dayjs } from "@/lib/utils/format/date";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
type WithId = { id: string };

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
  useDuplicate: () => ReturnType<
    typeof useMutation<{ id: string }, Error, string>
  >;
};

export function makeRpEntity<
  TItem extends WithId,
  TCreateBody,
  TUpdateBody,
  TDetail extends WithId = TItem,
>(opts: {
  listKey: () => readonly unknown[];
  itemKey: (id: string) => readonly unknown[];
  readList: () => Promise<TItem[] | null>;
  readItem: (id: string) => Promise<TDetail | null>;
  upsertLocal: (row: TItem) => Promise<void>;
  deleteLocal: (id: string) => Promise<void>;
  nameField?: string;
  cloneEntity?: (
    detail: TDetail,
    newId: string,
    copyName: string,
  ) => Promise<void>;
}): EntityHooks<TItem, TCreateBody, TUpdateBody, TDetail> {
  const nameField = opts.nameField ?? "name";
  return {
    useList: () => {
      return useQuery({
        queryKey: opts.listKey(),
        queryFn: async () => (await opts.readList()) ?? [],
      });
    },

    useItem: (id: string | undefined) => {
      return useQuery({
        queryKey: opts.itemKey(id ?? ""),
        queryFn: async () => {
          if (!id) throw new Error("not-found");
          const item = await opts.readItem(id);
          if (!item) throw new Error("not-found");
          return item;
        },
        enabled: !!id,
      });
    },

    useCreate: () => {
      const t = useTranslations();
      const qc = useQueryClient();
      return useMutation({
        mutationFn: async (args: { body: TCreateBody }) => {
          const now = dayjs().toDate();
          const row = {
            ...args.body,
            id: uid(),
            createdAt: now,
            updatedAt: now,
          } as unknown as TItem;
          await opts.upsertLocal(row);
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
      return useMutation({
        mutationFn: async (args: { id: string; body: TUpdateBody }) => {
          const existing = await opts.readItem(args.id);
          if (!existing) throw new Error("not-found");
          const now = dayjs().toDate();
          const updated = {
            ...existing,
            ...args.body,
            updatedAt: now,
          } as unknown as TItem;
          await opts.upsertLocal(updated);
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
      return useMutation({
        mutationFn: async (id: string) => {
          await opts.deleteLocal(id);
          return { id };
        },
        onSuccess: (_data, id) => {
          qc.removeQueries({ queryKey: opts.itemKey(id) as string[] });
          invalidateAndBroadcast(qc, [opts.listKey() as string[]]);
        },
        onError: (e) => handleError(e, t),
      });
    },

    useDuplicate: () => {
      const t = useTranslations();
      const qc = useQueryClient();
      return useMutation({
        mutationFn: async (id: string) => {
          const detail = await opts.readItem(id);
          if (!detail) throw new Error("not-found");
          const newId = uid();
          const srcName = (detail as Record<string, unknown>)[nameField];
          const copyName =
            `${typeof srcName === "string" ? srcName : ""} ${t("RP.COPY_SUFFIX")}`.trim();
          if (opts.cloneEntity) {
            await opts.cloneEntity(detail, newId, copyName);
          } else {
            const now = dayjs().toDate();
            const row = {
              ...(detail as Record<string, unknown>),
              id: newId,
              [nameField]: copyName,
              createdAt: now,
              updatedAt: now,
            } as unknown as TItem;
            await opts.upsertLocal(row);
          }
          return { id: newId };
        },
        onSuccess: () => {
          invalidateAndBroadcast(qc, [opts.listKey() as string[]]);
        },
        onError: (e) => handleError(e, t),
      });
    },
  };
}
