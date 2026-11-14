"use client";

import { invalidateAndBroadcast } from "@/lib/react-query/cross-tab-invalidate";
import { uid } from "@/lib/utils/base";
import { handleError } from "@/lib/utils/client";
import { dayjs } from "@/lib/utils/format/date";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import type { LocalAnyRow, LocalRowInput } from "@/lib/types";

export function makeRpEntity<
  TItem extends LocalAnyRow,
  TCreateBody extends LocalRowInput,
  TUpdateBody extends LocalRowInput,
  TDetail extends LocalAnyRow = TItem,
>(opts: {
  listKey: () => readonly unknown[];
  itemKey: (id: string) => readonly unknown[];
  readList: () => Promise<TItem[] | null>;
  readItem: (id: string) => Promise<TDetail | null>;
  upsertLocal: (row: LocalAnyRow) => Promise<void>;
  deleteLocal: (id: string) => Promise<void>;
  nameField?: string;
  cloneEntity?: (
    detail: TDetail,
    newId: string,
    copyName: string,
  ) => Promise<void>;
}) {
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
          const id = uid();
          await opts.upsertLocal({
            ...args.body,
            id,
            createdAt: now,
            updatedAt: now,
          });
          return { id };
        },
        onSuccess: () => {
          invalidateAndBroadcast(qc, [opts.listKey()]);
          toast.success(t("COMMON.SAVED"));
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
          await opts.upsertLocal({
            ...existing,
            ...args.body,
            updatedAt: now,
          });
          return { id: args.id };
        },
        onSuccess: (_data, args) => {
          invalidateAndBroadcast(qc, [opts.listKey(), opts.itemKey(args.id)]);
          toast.success(t("COMMON.SAVED"));
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
          qc.removeQueries({ queryKey: opts.itemKey(id) });
          invalidateAndBroadcast(qc, [opts.listKey()]);
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
          const srcName = detail[nameField];
          const copyName =
            `${typeof srcName === "string" ? srcName : ""} ${t("RP.COPY_SUFFIX")}`.trim();
          if (opts.cloneEntity) {
            await opts.cloneEntity(detail, newId, copyName);
          } else {
            const now = dayjs().toDate();
            await opts.upsertLocal({
              ...detail,
              id: newId,
              [nameField]: copyName,
              createdAt: now,
              updatedAt: now,
            });
          }
          return { id: newId };
        },
        onSuccess: () => {
          invalidateAndBroadcast(qc, [opts.listKey()]);
        },
        onError: (e) => handleError(e, t),
      });
    },
  };
}
