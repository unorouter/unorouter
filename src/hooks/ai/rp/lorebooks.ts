"use client";

import { GUEST_USER_ID } from "@/lib/config/constants";

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
import { rpc } from "@/lib/rpc";
import type { LorebookRow } from "@/lib/db/schema/rows";
import type { EdenArgs } from "@/lib/types/eden";
import { uid } from "@/lib/utils/base";
import { handleError } from "@/lib/utils/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { makeRpEntity } from "./factory";
import { mirrorSyncedRow } from "./shared";
import { parseLorebookJson } from "@/lib/ai/rp/lorebook-import";

// Re-mirror a synced lorebook as a bundle (with entries) after any entry
// mutation. Lorebooks are nested resources on the sync layer.
async function mirrorLorebookIfSynced(userId: number, lorebookId: string) {
  const lb = await readLocalLorebook(userId, lorebookId);
  if (!lb || lb.syncExpiresAt == null) return;
  await mirrorSyncedRow(userId, "lorebooks", lorebookId, {
    lorebook: { ...lb, entries: undefined },
    entries: lb.entries,
  });
}

// The lorebook update flow needs a custom mirror payload (bundle with
// entries), so we replace the factory's `useUpdate` to keep the contract.
const lorebooks = makeRpEntity<
  LorebookRow,
  Record<string, unknown>,
  Record<string, unknown>
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
export const useCreateLorebookMutation = lorebooks.useCreate;
export const useDeleteLorebookMutation = lorebooks.useDelete;

export function useLorebookQuery(id?: string) {
  const auth = useAuthQuery();
  return useQuery({
    queryKey: queryKeys.lorebook(id!),
    queryFn: async () => {
      const userId = auth.data?.id ?? GUEST_USER_ID;
      if (!id) throw new Error("not-found");
      const local = await readLocalLorebook(userId, id);
      if (!local) throw new Error("not-found");
      return local;
    },
    enabled: !!id,
  });
}

// Bespoke update — re-mirrors the bundle (lorebook + entries) so a synced
// lorebook stays consistent on the server side after a name/tag/etc edit.
export function useUpdateLorebookMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      body: EdenArgs<ReturnType<typeof rpc.api.ai.rp.lorebooks>, "put">["body"];
    }) => {
      const userId = auth.data?.id ?? GUEST_USER_ID;
      const existing = await readLocalLorebook(userId, args.id);
      if (!existing) throw new Error("not-found");
      const now = dayjs().toDate();
      // readLocalLorebook returns the lorebook merged with an `entries` array;
      // strip it before the upsert since `lorebooks` has no entries column.
      const { entries: _entries, ...existingRow } = existing;
      const updated = { ...existingRow, ...args.body, updatedAt: now };
      await upsertLocalLorebook(userId, updated as never);
      if (existing.syncExpiresAt != null) {
        await mirrorLorebookIfSynced(userId, args.id);
      }
      return updated;
    },
    onSuccess: (_data, args) => {
      qc.invalidateQueries({ queryKey: queryKeys.lorebooks() });
      qc.invalidateQueries({ queryKey: queryKeys.lorebook(args.id) });
    },
    onError: (e) => handleError(e, t),
  });
}

export function useImportLorebookMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (file: File) => {
      const userId = auth.data?.id ?? GUEST_USER_ID;
      let raw: unknown;
      try {
        raw = JSON.parse(await file.text());
      } catch {
        throw new Error("ERRORS.REQUEST_FAILED");
      }
      const parsed = parseLorebookJson(raw);
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.lorebooks() });
    },
    onError: (e) => handleError(e, t),
  });
}

// --- Entries -------------------------------------------------------------

export function useCreateLorebookEntryMutation(lorebookId: string) {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (
      body: EdenArgs<
        ReturnType<typeof rpc.api.ai.rp.lorebooks>["entries"],
        "post"
      >["body"],
    ) => {
      const userId = auth.data?.id ?? GUEST_USER_ID;
      const now = dayjs().toDate();
      const row = {
        ...body,
        id: uid(),
        lorebookId,
        createdAt: now,
        updatedAt: now,
      };
      await upsertLocalLorebookEntry(userId, row);
      await mirrorLorebookIfSynced(userId, lorebookId);
      return row;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.lorebook(lorebookId) });
    },
    onError: (e) => handleError(e, t),
  });
}

export function useUpdateLorebookEntryMutation(lorebookId: string) {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (args: {
      entryId: string;
      body: EdenArgs<
        ReturnType<ReturnType<typeof rpc.api.ai.rp.lorebooks>["entries"]>,
        "put"
      >["body"];
    }) => {
      const userId = auth.data?.id ?? GUEST_USER_ID;
      const now = dayjs().toDate();
      const lb = await readLocalLorebook(userId, lorebookId);
      const existing = lb?.entries.find((e) => e.id === args.entryId);
      const updated = {
        ...(existing ?? {}),
        id: args.entryId,
        lorebookId,
        ...args.body,
        updatedAt: now,
      };
      await upsertLocalLorebookEntry(userId, updated);
      await mirrorLorebookIfSynced(userId, lorebookId);
      return updated;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.lorebook(lorebookId) });
    },
    onError: (e) => handleError(e, t),
  });
}

export function useDeleteLorebookEntryMutation(lorebookId: string) {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (entryId: string) => {
      const userId = auth.data?.id ?? GUEST_USER_ID;
      await deleteLocalLorebookEntry(userId, entryId);
      await mirrorLorebookIfSynced(userId, lorebookId);
      return { id: entryId };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.lorebook(lorebookId) });
    },
    onError: (e) => handleError(e, t),
  });
}
