"use client";

import { useApiMutation } from "@/lib/react-query/hooks";
import { safeJsonParse, uid } from "@/lib/utils/base";
import { dayjs } from "@/lib/utils/format/date";
import { useQuery } from "@tanstack/react-query";
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

    useCreate: () =>
      useApiMutation({
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
        invalidates: [opts.listKey()],
        successKey: "COMMON.SAVED",
      }),

    useUpdate: () =>
      useApiMutation({
        mutationFn: async (args: { id: string; body: TUpdateBody }) => {
          const existing = await opts.readItem(args.id);
          if (!existing) throw new Error("not-found");
          await opts.upsertLocal({
            ...existing,
            ...args.body,
            updatedAt: dayjs().toDate(),
          });
          return { id: args.id };
        },
        invalidates: (args) => [opts.listKey(), opts.itemKey(args.id)],
        successKey: "COMMON.SAVED",
      }),

    useDelete: () =>
      useApiMutation({
        mutationFn: async (id: string) => {
          await opts.deleteLocal(id);
          return { id };
        },
        invalidates: [opts.listKey()],
        onSuccess: (_data, id, qc) =>
          qc.removeQueries({ queryKey: opts.itemKey(id) }),
      }),

    useDuplicate: () => {
      const t = useTranslations();
      return useApiMutation({
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
        invalidates: [opts.listKey()],
      });
    },
  };
}

export async function readJsonFile(
  file: File,
  error: string,
): Promise<unknown> {
  const raw = safeJsonParse<unknown>(await file.text(), undefined);
  if (raw === undefined) throw new Error(error);
  return raw;
}
