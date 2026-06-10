"use client";

import { GUEST_USER_ID } from "@/lib/config/constants";
import { useApiMutation } from "@/hooks/use-api-mutation";

import { useAuthQuery } from "@/hooks/auth/auth-hook";
import {
  deleteLocalLorebook,
  deleteLocalLorebookEntry,
  readLocalLorebook,
  readLocalLorebooks,
  upsertLocalLorebook,
  upsertLocalLorebookBundle,
  upsertLocalLorebookEntry,
} from "@/lib/db/client/data/rp";
import { queryKeys } from "@/lib/react-query/keys";
import type { LorebookRow } from "@/lib/db/schema/rows";
import type { LorebookBody, LorebookEntryBody } from "@/lib/validation/rp";
import { uid } from "@/lib/utils/base";
import { dayjs } from "@/lib/utils/format/date";
import { makeRpEntity } from "./factory";
import { mirrorSyncedRow } from "@/lib/db/client/sync/mirror";

// Re-mirror lorebook bundle after entry mutation.
async function mirrorLorebookIfSynced(userId: number, lorebookId: string) {
  const lb = await readLocalLorebook(userId, lorebookId);
  if (!lb || lb.syncExpiresAt == null) return;
  await mirrorSyncedRow(userId, "lorebooks", lorebookId);
}

// Custom mirror payload (bundle + entries) replaces factory useUpdate.
const lorebooks = makeRpEntity<
  LorebookRow,
  Record<string, unknown>,
  Record<string, unknown>,
  NonNullable<Awaited<ReturnType<typeof readLocalLorebook>>>
>({
  syncKind: "lorebooks",
  listKey: queryKeys.lorebooks,
  itemKey: queryKeys.lorebook,
  readList: readLocalLorebooks,
  readItem: readLocalLorebook,
  upsertLocal: upsertLocalLorebook,
  deleteLocal: deleteLocalLorebook,
});

export const useLorebooksQuery = lorebooks.useList;
export const useLorebookQuery = lorebooks.useItem;
export const useCreateLorebookMutation = lorebooks.useCreate;
export const useDeleteLorebookMutation = lorebooks.useDelete;

// Bespoke update re-mirrors bundle after edit.
export function useUpdateLorebookMutation() {
    const auth = useAuthQuery();
  return useApiMutation({
    mutationFn: async (args: { id: string; body: LorebookBody }) => {
      const userId = auth.data?.id ?? GUEST_USER_ID;
      const existing = await readLocalLorebook(userId, args.id);
      if (!existing) throw new Error("not-found");
      const now = dayjs().toDate();
      // Strip entries before lorebooks upsert (no entries column).
      const { entries: _entries, ...existingRow } = existing;
      const updated = { ...existingRow, ...args.body, updatedAt: now };
      await upsertLocalLorebook(userId, updated as never);
      await mirrorLorebookIfSynced(userId, args.id);
      return updated;
    },
    invalidates: (args) => [queryKeys.lorebooks(), queryKeys.lorebook(args.id)],
  });
}

export function useImportLorebookMutation() {
    const auth = useAuthQuery();
  return useApiMutation({
    mutationFn: async (file: File) => {
      const userId = auth.data?.id ?? GUEST_USER_ID;
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
        userId,
        name: parsed.name,
        description: parsed.description ?? null,
        scanDepth: parsed.scanDepth ?? 4,
        tokenBudget: parsed.tokenBudget ?? 1500,
        recursiveScanning: parsed.recursiveScanning ?? false,
        syncExpiresAt: null,
        createdAt: now,
        updatedAt: now,
      };
      const entries = parsed.entries.map((e, i) => ({
        id: uid(),
        lorebookId: id,
        keys: e.keys,
        secondaryKeys: e.secondaryKeys ?? null,
        content: e.content,
        constant: e.constant,
        selective: e.selective,
        priority: e.priority,
        position: e.position,
        depth: e.depth,
        enabled: e.enabled,
        orderIndex: e.orderIndex ?? i,
        matchWholeWords: false,
        injectionRole: "user" as const,
        createdAt: now,
        updatedAt: now,
      }));
      await upsertLocalLorebookBundle(userId, {
        lorebook: lorebook as never,
        entries: entries as never,
      });
      return { ...lorebook, entries };
    },
    invalidates: [queryKeys.lorebooks()],
  });
}

// Entries.

export function useCreateLorebookEntryMutation(lorebookId: string) {
    const auth = useAuthQuery();
  return useApiMutation({
    mutationFn: async (body: LorebookEntryBody) => {
      const userId = auth.data?.id ?? GUEST_USER_ID;
      const now = dayjs().toDate();
      // Append to the end: next orderIndex above the current max (Risu insertorder).
      const lb = await readLocalLorebook(userId, lorebookId);
      const nextOrder =
        (lb?.entries.reduce((m, e) => Math.max(m, e.orderIndex ?? 0), -1) ??
          -1) + 1;
      const row = {
        ...body,
        orderIndex: nextOrder,
        id: uid(),
        lorebookId,
        createdAt: now,
        updatedAt: now,
      };
      await upsertLocalLorebookEntry(userId, row);
      await mirrorLorebookIfSynced(userId, lorebookId);
      return row;
    },
    invalidates: [queryKeys.lorebook(lorebookId)],
  });
}

export function useUpdateLorebookEntryMutation(lorebookId: string) {
    const auth = useAuthQuery();
  return useApiMutation({
    mutationFn: async (args: { entryId: string; body: LorebookEntryBody }) => {
      const userId = auth.data?.id ?? GUEST_USER_ID;
      const now = dayjs().toDate();
      const lb = await readLocalLorebook(userId, lorebookId);
      const existing = lb?.entries.find((e) => e.id === args.entryId);
      const updated = {
        ...(existing ?? {}),
        id: args.entryId,
        lorebookId,
        ...args.body,
        // Preserve placement: form edits never reset insertion order.
        orderIndex: existing?.orderIndex ?? 0,
        updatedAt: now,
      };
      await upsertLocalLorebookEntry(userId, updated);
      await mirrorLorebookIfSynced(userId, lorebookId);
      return updated;
    },
    invalidates: [queryKeys.lorebook(lorebookId)],
  });
}

export function useReorderLorebookEntriesMutation(lorebookId: string) {
    const auth = useAuthQuery();
  return useApiMutation({
    mutationFn: async (orderedIds: string[]) => {
      const userId = auth.data?.id ?? GUEST_USER_ID;
      const now = dayjs().toDate();
      const lb = await readLocalLorebook(userId, lorebookId);
      if (!lb) return;
      const byId = new Map(lb.entries.map((e) => [e.id, e]));
      for (let i = 0; i < orderedIds.length; i++) {
        const existing = byId.get(orderedIds[i]);
        if (!existing) continue;
        await upsertLocalLorebookEntry(userId, {
          ...existing,
          orderIndex: i,
          updatedAt: now,
        });
      }
      await mirrorLorebookIfSynced(userId, lorebookId);
    },
    invalidates: [queryKeys.lorebook(lorebookId)],
  });
}

export function useDeleteLorebookEntryMutation(lorebookId: string) {
    const auth = useAuthQuery();
  return useApiMutation({
    mutationFn: async (entryId: string) => {
      const userId = auth.data?.id ?? GUEST_USER_ID;
      await deleteLocalLorebookEntry(userId, entryId);
      await mirrorLorebookIfSynced(userId, lorebookId);
      return { id: entryId };
    },
    invalidates: [queryKeys.lorebook(lorebookId)],
  });
}
