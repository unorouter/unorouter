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

export function useSessionHistoryQuery(
  query?: EdenQuery<typeof rpc.api.ai.playground.me>,
) {
  return useQuery({
    queryKey: queryKeys.playgroundSessionList(query),
    queryFn: async () =>
      handleElysia(await rpc.api.ai.playground.me.get({ query })),
  });
}

export function useSessionQuery(sessionId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.playgroundSession(sessionId ?? ""),
    queryFn: async () =>
      handleElysia(
        await rpc.api.ai.playground.session({ sessionId: sessionId! }).get(),
      ),
    enabled: !!sessionId,
    retry: false,
  });
}

export function useSnapshotQuery(id: string | null ) {
  return useQuery({
    queryKey: queryKeys.playgroundSnapshot(id ?? ""),
    queryFn: async () =>
      handleElysia(await rpc.api.ai.playground.snapshot({ id: id! }).get()),
    enabled: !!id,
    retry: false,
  });
}

export function useSnapshotStatusQuery(
  id: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.playgroundSnapshotStatus(id ?? ""),
    queryFn: async () =>
      handleElysia(await rpc.api.ai.playground.snapshot({ id: id! }).status.get()),
    enabled: enabled && !!id,
    retry: false,
    refetchInterval: (query) => {
      const status = (query.state.data as { status?: string } | undefined)
        ?.status;
      return status === "success" || status === "failure"
        ? false
        : POLL_INTERVAL_MS;
    },
    refetchIntervalInBackground: true,
  });
}

export function useSubmitGenerationMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.ai.playground.submit, "post">,
    ) => handleElysia(await rpc.api.ai.playground.submit.post(args.body)),
    onError: (e) => handleError(e, t),
    onSuccess: (data) => {
      // Seed the snapshot's status cache so the polling hook starts from
      // the server-returned shape.
      qc.setQueryData(
        queryKeys.playgroundSnapshot(data.snapshot.id),
        data.snapshot,
      );
      qc.setQueryData(
        queryKeys.playgroundSnapshotStatus(data.snapshot.id),
        data.snapshot,
      );
      // Invalidate the session list (new session created or existing one
      // moved to the top) and the session detail (new snapshot appended).
      qc.invalidateQueries({ queryKey: queryKeys.playgroundSessionLists() });
      qc.invalidateQueries({
        queryKey: queryKeys.playgroundSession(data.session.id),
      });
    },
  });
}

export function useDeleteSnapshotMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string }) =>
      handleElysia(await rpc.api.ai.playground.snapshot({ id: args.id }).delete()),
    onError: (e) => handleError(e, t),
    onSuccess: (data, args) => {
      qc.removeQueries({
        queryKey: queryKeys.playgroundSnapshot(args.id),
      });
      qc.removeQueries({
        queryKey: queryKeys.playgroundSnapshotStatus(args.id),
      });
      qc.invalidateQueries({ queryKey: queryKeys.playgroundSessionLists() });
      if (data?.sessionId) {
        qc.invalidateQueries({
          queryKey: queryKeys.playgroundSession(data.sessionId),
        });
      }
    },
  });
}

export function useLoraCatalogQuery(
  query?: EdenQuery<typeof rpc.api.ai.playground.loras>,
) {
  return useQuery({
    queryKey: queryKeys.loraCatalog(query),
    queryFn: async () =>
      handleElysia(await rpc.api.ai.playground.loras.get({ query })),
  });
}

export function useUploadReferenceMutation() {
  const t = useTranslations();
  return useMutation({
    mutationFn: async (file: File) =>
      handleElysia(await rpc.api.ai.playground.references.post({ file })),
    onError: (e) => handleError(e, t),
  });
}

// Routes through /generation/masks (not /references) so the server route can
// grow mask-specific validation later (size, channel count) without touching
// the reference pipeline.
export function useUploadMaskMutation() {
  const t = useTranslations();
  return useMutation({
    mutationFn: async (file: File) =>
      handleElysia(await rpc.api.ai.playground.masks.post({ file })),
    onError: (e) => handleError(e, t),
  });
}

export function useEmbeddingCatalogQuery(
  query?: EdenQuery<typeof rpc.api.ai.playground.embeddings>,
) {
  return useQuery({
    queryKey: queryKeys.embeddingCatalog(query),
    queryFn: async () =>
      handleElysia(await rpc.api.ai.playground.embeddings.get({ query })),
  });
}

export function useUpscalerCatalogQuery(
  query?: EdenQuery<typeof rpc.api.ai.playground.upscalers>,
) {
  return useQuery({
    queryKey: queryKeys.upscalerCatalog(query),
    queryFn: async () =>
      handleElysia(await rpc.api.ai.playground.upscalers.get({ query })),
  });
}


export function useExportSessionMutation() {
  const t = useTranslations();
  return useMutation({
    mutationFn: async (args: { sessionId: string }) =>
      handleElysia(
        await rpc.api.ai.playground
          .session({ sessionId: args.sessionId })
          .export.get(),
      ),
    onError: (e) => handleError(e, t),
  });
}

export function useImportGenerationMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.ai.playground.import, "post">,
    ) => handleElysia(await rpc.api.ai.playground.import.post(args.body)),
    onError: (e) => handleError(e, t),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.playgroundSessionLists() });
    },
  });
}

