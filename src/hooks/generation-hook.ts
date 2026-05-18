"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenArgs, EdenQuery } from "@/lib/types/eden";
import { handleElysia } from "@/lib/utils/base";
import { handleError } from "@/lib/utils/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

// 2s polling cadence matches the chat task hook. Stops on terminal.
const POLL_INTERVAL_MS = 2000;

function isTerminalStatus(s: string | undefined): boolean {
  return s === "success" || s === "failure";
}

// ---------------------------------------------------------------------------
// Sessions: history list + per-session detail
// ---------------------------------------------------------------------------

/** Recent sessions list, newest-updated first. Feeds the vertical session
 *  rail under the result column and the sidebar list. */
export function useSessionHistoryQuery(
  params?: EdenQuery<typeof rpc.api.generation.me>,
) {
  return useQuery({
    queryKey: queryKeys.generationSessionList(params),
    queryFn: async () =>
      handleElysia(
        await rpc.api.generation.me.get({
          query: params ?? {},
        }),
      ),
    staleTime: 5_000,
  });
}

/** Full session: the session row + all snapshots (with their images),
 *  newest first. Powers the chevron view. */
export function useSessionQuery(sessionId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.generationSession(sessionId ?? ""),
    queryFn: async () =>
      handleElysia(
        await rpc.api.generation.session({ sessionId: sessionId! }).get(),
      ),
    enabled: !!sessionId,
    retry: false,
  });
}

// ---------------------------------------------------------------------------
// Snapshots: single detail + polling
// ---------------------------------------------------------------------------

export function useSnapshotQuery(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.generationSnapshot(id ?? ""),
    queryFn: async () =>
      handleElysia(await rpc.api.generation.snapshot({ id: id! }).get()),
    enabled: !!id,
    retry: false,
  });
}

/** Polls /generation/snapshot/:id/status until terminal. */
export function useSnapshotStatusQuery(
  id: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.generationSnapshotStatus(id ?? ""),
    queryFn: async () =>
      handleElysia(await rpc.api.generation.snapshot({ id: id! }).status.get()),
    enabled: enabled && !!id,
    retry: false,
    staleTime: 0,
    refetchInterval: (query) => {
      const status = (query.state.data as { status?: string } | undefined)
        ?.status;
      return isTerminalStatus(status) ? false : POLL_INTERVAL_MS;
    },
    refetchIntervalInBackground: true,
  });
}

// ---------------------------------------------------------------------------
// Submit + delete
// ---------------------------------------------------------------------------

export function useSubmitGenerationMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.generation.submit, "post">,
    ) => handleElysia(await rpc.api.generation.submit.post(args.body)),
    onError: (e) => handleError(e, t),
    onSuccess: (data) => {
      // Seed the snapshot's status cache so the polling hook starts from
      // the server-returned shape.
      qc.setQueryData(
        queryKeys.generationSnapshot(data.snapshot.id),
        data.snapshot,
      );
      qc.setQueryData(
        queryKeys.generationSnapshotStatus(data.snapshot.id),
        data.snapshot,
      );
      // Invalidate the session list (new session created or existing one
      // moved to the top) and the session detail (new snapshot appended).
      qc.invalidateQueries({ queryKey: ["generation-session-list"] });
      qc.invalidateQueries({
        queryKey: queryKeys.generationSession(data.session.id),
      });
    },
  });
}

export function useSetSnapshotVisibilityMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      body: EdenArgs<
        ReturnType<typeof rpc.api.generation.snapshot>["visibility"],
        "post"
      >["body"];
    }) =>
      handleElysia(
        await rpc.api.generation
          .snapshot({ id: args.id })
          .visibility.post(args.body),
      ),
    onError: (e) => handleError(e, t),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.generationSnapshot(data.id), data);
      qc.invalidateQueries({ queryKey: ["generation-session-list"] });
    },
  });
}

export function useDeleteSnapshotMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string }) =>
      handleElysia(await rpc.api.generation.snapshot({ id: args.id }).delete()),
    onError: (e) => handleError(e, t),
    onSuccess: (data, args) => {
      qc.removeQueries({
        queryKey: queryKeys.generationSnapshot(args.id),
      });
      qc.removeQueries({
        queryKey: queryKeys.generationSnapshotStatus(args.id),
      });
      qc.invalidateQueries({ queryKey: ["generation-session-list"] });
      if (data?.sessionId) {
        qc.invalidateQueries({
          queryKey: queryKeys.generationSession(data.sessionId),
        });
      }
    },
  });
}

export function useDeleteSessionMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { sessionId: string }) =>
      handleElysia(
        await rpc.api.generation
          .session({ sessionId: args.sessionId })
          .delete(),
      ),
    onError: (e) => handleError(e, t),
    onSuccess: (_data, args) => {
      qc.removeQueries({
        queryKey: queryKeys.generationSession(args.sessionId),
      });
      qc.invalidateQueries({ queryKey: ["generation-session-list"] });
    },
  });
}

// ---------------------------------------------------------------------------
// LoRA catalog (unchanged)
// ---------------------------------------------------------------------------

export function useLoraCatalogQuery(
  params?: EdenQuery<typeof rpc.api.generation.loras>,
) {
  return useQuery({
    queryKey: queryKeys.loraCatalog(params),
    queryFn: async () =>
      handleElysia(
        await rpc.api.generation.loras.get({
          query: params ?? {},
        }),
      ),
    staleTime: 5 * 60_000,
  });
}

export function useUploadReferenceMutation() {
  const t = useTranslations();
  return useMutation({
    mutationFn: async (file: File) =>
      handleElysia(await rpc.api.generation.references.post({ file })),
    onError: (e) => handleError(e, t),
  });
}

// Inpaint mask upload: same shape as reference upload (multipart -> R2)
// but routes through /generation/masks so the server-side route can grow
// mask-specific validation later (size, channel count, etc.) without
// touching the existing reference pipeline.
export function useUploadMaskMutation() {
  const t = useTranslations();
  return useMutation({
    mutationFn: async (file: File) =>
      handleElysia(await rpc.api.generation.masks.post({ file })),
    onError: (e) => handleError(e, t),
  });
}

// ---------------------------------------------------------------------------
// New catalogs: embeddings, upscalers, controlnets. Same shape and cache
// strategy as the LoRA catalog.
// ---------------------------------------------------------------------------

export function useEmbeddingCatalogQuery(
  params?: EdenQuery<typeof rpc.api.generation.embeddings>,
) {
  return useQuery({
    queryKey: queryKeys.embeddingCatalog(params),
    queryFn: async () =>
      handleElysia(
        await rpc.api.generation.embeddings.get({ query: params ?? {} }),
      ),
    staleTime: 5 * 60_000,
  });
}

export function useUpscalerCatalogQuery(
  params?: EdenQuery<typeof rpc.api.generation.upscalers>,
) {
  return useQuery({
    queryKey: queryKeys.upscalerCatalog(params),
    queryFn: async () =>
      handleElysia(
        await rpc.api.generation.upscalers.get({ query: params ?? {} }),
      ),
    staleTime: 5 * 60_000,
  });
}

export function useControlNetCatalogQuery(
  params?: EdenQuery<typeof rpc.api.generation.controlnets>,
) {
  return useQuery({
    queryKey: queryKeys.controlNetCatalog(params),
    queryFn: async () =>
      handleElysia(
        await rpc.api.generation.controlnets.get({ query: params ?? {} }),
      ),
    staleTime: 5 * 60_000,
  });
}

// ---------------------------------------------------------------------------
// Export / import (session-level)
// ---------------------------------------------------------------------------

/** Fetches the full session export payload. The caller wraps the result
 *  in a Blob + downloadable anchor. */
export function useExportSessionMutation() {
  const t = useTranslations();
  return useMutation({
    mutationFn: async (args: { sessionId: string }) =>
      handleElysia(
        await rpc.api.generation
          .session({ sessionId: args.sessionId })
          .export.get(),
      ),
    onError: (e) => handleError(e, t),
  });
}

/** Uploads a payload (single-snapshot or session) and clones it into the
 *  user's account. Returns the new session id. */
export function useImportGenerationMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.generation.import, "post">,
    ) => handleElysia(await rpc.api.generation.import.post(args.body)),
    onError: (e) => handleError(e, t),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["generation-session-list"] });
    },
  });
}

type SessionListData = NonNullable<
  NonNullable<Awaited<ReturnType<typeof rpc.api.generation.me.get>>["data"]>
>["data"];
type SubmitData = NonNullable<
  NonNullable<
    Awaited<ReturnType<typeof rpc.api.generation.submit.post>>["data"]
  >
>["data"];

export type GenerationSnapshotDetail = SubmitData["snapshot"];
export type GenerationSessionItem = SessionListData["items"][number];
