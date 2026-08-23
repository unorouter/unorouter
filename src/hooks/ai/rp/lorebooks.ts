"use client";

import { useApiMutation } from "@/lib/react-query/hooks";

import { msg } from "@/lib/config/constants";
import { upsertLocalJsPlugin } from "@/lib/db/client/data/rp/js-plugins";
import {
  deleteLocalLorebook,
  deleteLocalLorebookEntry,
  readLocalLorebook,
  readLocalLorebooks,
  upsertLocalLorebook,
  upsertLocalLorebookBundle,
  upsertLocalLorebookEntry,
} from "@/lib/db/client/data/rp/rp";
import type { LorebookRow } from "@/lib/db/schema/rows";
import { queryKeys } from "@/lib/react-query/keys";
import { uid } from "@/lib/utils/base";
import { dayjs } from "@/lib/utils/format/date";
import type { LorebookBody, LorebookEntryBody } from "@/lib/validation/rp";
import { makeRpEntity } from "./factory";
import { runUrlImport } from "./use-url-import";

const lorebooks = makeRpEntity<
  LorebookRow,
  Record<string, unknown>,
  Record<string, unknown>,
  NonNullable<Awaited<ReturnType<typeof readLocalLorebook>>>
>({
  listKey: queryKeys.lorebooks,
  itemKey: queryKeys.lorebook,
  readList: readLocalLorebooks,
  readItem: readLocalLorebook,
  upsertLocal: upsertLocalLorebook,
  deleteLocal: deleteLocalLorebook,
  cloneEntity: async (detail, newId, copyName) => {
    const now = dayjs().toDate();
    const { entries, ...book } = detail;
    const lorebook = {
      ...book,
      id: newId,
      name: copyName,
      createdAt: now,
      updatedAt: now,
    };
    const clonedEntries = (entries ?? []).map((e) => ({
      ...e,
      id: uid(),
      lorebookId: newId,
      createdAt: now,
      updatedAt: now,
    }));
    await upsertLocalLorebookBundle({
      lorebook: lorebook,
      entries: clonedEntries,
    });
  },
});

export const useLorebooksQuery = lorebooks.useList;
export const useLorebookQuery = lorebooks.useItem;
export const useCreateLorebookMutation = lorebooks.useCreate;
export const useDeleteLorebookMutation = lorebooks.useDelete;
export const useDuplicateLorebookMutation = lorebooks.useDuplicate;

export function useUpdateLorebookMutation() {
  return useApiMutation({
    mutationFn: async (args: { id: string; body: LorebookBody }) => {
      const existing = await readLocalLorebook(args.id);
      if (!existing) throw new Error("not-found");
      const now = dayjs().toDate();
      const { entries: _entries, ...existingRow } = existing;
      const updated = { ...existingRow, ...args.body, updatedAt: now };
      await upsertLocalLorebook(updated);
      return updated;
    },
    invalidates: (args) => [queryKeys.lorebooks(), queryKeys.lorebook(args.id)],
  });
}

export function useImportLorebookMutation() {
  return useApiMutation({
    mutationFn: async (file: File) => {
      let raw: unknown;
      try {
        raw = JSON.parse(await file.text());
      } catch {
        throw new Error("ERRORS.REQUEST_FAILED");
      }
      const parsed = (
        await import("@/lib/ai/rp/lorebook-import")
      ).parseLorebookJson(raw);
      if (!parsed) throw new Error("ERRORS.REQUEST_FAILED");
      const id = uid();
      const now = dayjs().toDate();
      const lorebook = {
        id,
        name: parsed.name,
        description: parsed.description ?? null,
        scanDepth: parsed.scanDepth ?? 4,
        tokenBudget: parsed.tokenBudget ?? 1500,
        recursiveScanning: parsed.recursiveScanning ?? false,
        createdAt: now,
        updatedAt: now,
      };
      const entries = parsed.entries.map((e, i) => ({
        id: uid(),
        lorebookId: id,
        comment: e.comment ?? null,
        keys: e.keys,
        secondaryKeys: e.secondaryKeys ?? null,
        content: e.content,
        constant: e.constant,
        selective: e.selective,
        priority: e.priority,
        enabled: e.enabled,
        orderIndex: e.orderIndex ?? i,
        matchWholeWords: false,
        injectionRole: "system" as const,
        createdAt: now,
        updatedAt: now,
      }));
      await upsertLocalLorebookBundle({
        lorebook: lorebook,
        entries: entries,
      });
      return { ...lorebook, entries };
    },
    invalidates: [queryKeys.lorebooks()],
  });
}

export function useCreateLorebookEntryMutation(lorebookId: string) {
  return useApiMutation({
    mutationFn: async (body: LorebookEntryBody) => {
      const now = dayjs().toDate();
      const lb = await readLocalLorebook(lorebookId);
      const nextOrder =
        (lb?.entries.reduce((m, e) => Math.max(m, e.orderIndex ?? 0), -1) ??
          -1) + 1;
      const row = {
        ...body,
        orderIndex: body.orderIndex || nextOrder,
        id: uid(),
        lorebookId,
        createdAt: now,
        updatedAt: now,
      };
      await upsertLocalLorebookEntry(row);
      return row;
    },
    invalidates: [queryKeys.lorebook(lorebookId)],
  });
}

export function useUpdateLorebookEntryMutation(lorebookId: string) {
  return useApiMutation({
    mutationFn: async (args: { entryId: string; body: LorebookEntryBody }) => {
      const now = dayjs().toDate();
      const lb = await readLocalLorebook(lorebookId);
      const existing = lb?.entries.find((e) => e.id === args.entryId);
      const updated = {
        ...(existing ?? {}),
        id: args.entryId,
        lorebookId,
        ...args.body,
        updatedAt: now,
      };
      await upsertLocalLorebookEntry(updated);
      return updated;
    },
    invalidates: [queryKeys.lorebook(lorebookId)],
  });
}

export function useReorderLorebookEntriesMutation(lorebookId: string) {
  return useApiMutation({
    mutationFn: async (orderedIds: string[]) => {
      const now = dayjs().toDate();
      const lb = await readLocalLorebook(lorebookId);
      if (!lb) return;
      const byId = new Map(lb.entries.map((e) => [e.id, e]));
      for (let i = 0; i < orderedIds.length; i++) {
        const existing = byId.get(orderedIds[i]);
        if (!existing) continue;
        await upsertLocalLorebookEntry({
          ...existing,
          orderIndex: i,
          updatedAt: now,
        });
      }
    },
    invalidates: [queryKeys.lorebook(lorebookId)],
  });
}

export function useDeleteLorebookEntryMutation(lorebookId: string) {
  return useApiMutation({
    mutationFn: async (entryId: string) => {
      await deleteLocalLorebookEntry(entryId);
      return { id: entryId };
    },
    invalidates: [queryKeys.lorebook(lorebookId)],
  });
}

// Standalone lorebooks published on their own, rather than attached to a card:
// a JanitorAI script link, a chub /lorebooks/ project, or a risu character
// whose book travels with it. The fetcher normalises all three, so this only
// has to write rows.
export function useImportLorebookFromUrlMutation() {
  return useApiMutation({
    mutationFn: (input: string) =>
      runUrlImport(input, async (result) => {
        // A JanitorAI "advanced" script builds its entries in code, so there are
        // no rows to write; it becomes a plugin that runs each turn instead.
        if (result.kind === "plugin" && result.plugin) {
          const now = dayjs().toDate();
          await upsertLocalJsPlugin({
            id: uid(),
            name: result.plugin.name,
            script: result.plugin.script,
            kind: "janitor",
            enabled: true,
            createdAt: now,
            updatedAt: now,
          });
          return { importedAsPlugin: result.plugin.name };
        }
        const books = result.lorebooks ?? [];
        if (books.length === 0) {
          // Named rather than silent: the source lists these but the author kept
          // the contents private, and nobody can fetch them.
          const withheld = (result.skipped ?? [])
            .map((s) => s.title)
            .join(", ");
          throw new Error(
            withheld
              ? `${msg("ERRORS.CARD_IMPORT_LOREBOOK_PRIVATE")}: ${withheld}`
              : msg("ERRORS.CARD_IMPORT_FETCH_FAILED"),
          );
        }
        const now = dayjs().toDate();
        for (const book of books) {
          const id = uid();
          await upsertLocalLorebookBundle({
            lorebook: {
              id,
              name: book.name,
              description: null,
              scanDepth: book.scanDepth ?? 4,
              tokenBudget: 1500,
              recursiveScanning: false,
              createdAt: now,
              updatedAt: now,
            },
            entries: book.entries.map((e, i) => ({
              id: uid(),
              lorebookId: id,
              keys: e.keys,
              secondaryKeys: e.secondaryKeys ?? null,
              content: e.content,
              comment: e.comment ?? null,
              enabled: e.enabled,
              constant: e.constant,
              selective: e.selective,
              priority: e.priority,
              orderIndex: e.orderIndex ?? i,
              matchWholeWords: e.matchWholeWords,
              injectionRole: "system" as const,
              createdAt: now,
              updatedAt: now,
            })),
          });
        }
        return { importedAsPlugin: null };
      }),
    // Both, because the same link can land as either a lorebook or a plugin.
    invalidates: [queryKeys.lorebooks(), queryKeys.jsPlugins()],
  });
}
