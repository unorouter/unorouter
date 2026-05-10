"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenArgs, EdenQuery } from "@/lib/types/eden";
import { handleElysia } from "@/lib/utils/base";
import { handleError } from "@/lib/utils/client";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useTranslations } from "next-intl";

type GenerationDetail = Awaited<
  ReturnType<typeof rpc.api.generation.submit.post>
>["data"];

// 2s polling cadence is the same as the chat-task hook. ~30 polls per
// minute per active tile is acceptable load given Phase 1 traffic; the
// query auto-stops on terminal status.
const POLL_INTERVAL_MS = 2000;

function isTerminalStatus(s: string | undefined): boolean {
  return s === "success" || s === "failure";
}

export function useGenerationHistoryQuery(
  params?: EdenQuery<typeof rpc.api.generation.me>,
) {
  return useQuery({
    queryKey: queryKeys.generationHistory(params),
    queryFn: async () =>
      handleElysia(
        await rpc.api.generation.me.get({
          query: params ?? {},
        }),
      ),
    staleTime: 5_000,
  });
}

export function useGenerationQuery(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.generation(id ?? ""),
    queryFn: async () =>
      handleElysia(await rpc.api.generation({ id: id! }).get()),
    enabled: !!id,
    // Don't retry on 404 / not-found; the page redirects to /generate on
    // first error and retries would just delay the bounce.
    retry: false,
  });
}

// Polls /generation/:id/status until terminal. The server inline-finalizes
// (downloads + uploads to R2) on the first SUCCESS observation, so the
// response that flips status to "success" already carries r2Url.
export function useGenerationStatusQuery(
  id: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.generationStatus(id ?? ""),
    queryFn: async () =>
      handleElysia(await rpc.api.generation({ id: id! }).status.get()),
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

export function useSubmitGenerationMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: EdenArgs<typeof rpc.api.generation.submit, "post">) =>
      handleElysia(await rpc.api.generation.submit.post(args.body)),
    onError: (e) => handleError(e, t),
    onSuccess: (data) => {
      // Seed the per-row cache so the polling hook starts from the same
      // shape the server returned, instead of waiting for the first poll.
      qc.setQueryData(queryKeys.generation(data.id), data);
      qc.setQueryData(queryKeys.generationStatus(data.id), data);
      // Invalidate history so the new row appears at the top of the rail.
      qc.invalidateQueries({ queryKey: ["generation-history"] });
    },
  });
}

export function useSetGenerationVisibilityMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      body: EdenArgs<
        ReturnType<typeof rpc.api.generation>["visibility"],
        "post"
      >["body"];
    }) =>
      handleElysia(
        await rpc.api.generation({ id: args.id }).visibility.post(args.body),
      ),
    onError: (e) => handleError(e, t),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.generation(data.id), data);
      qc.invalidateQueries({ queryKey: ["generation-history"] });
    },
  });
}

export function useDeleteGenerationMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string }) =>
      handleElysia(await rpc.api.generation({ id: args.id }).delete()),
    onError: (e) => handleError(e, t),
    onSuccess: (_data, args) => {
      qc.removeQueries({ queryKey: queryKeys.generation(args.id) });
      qc.removeQueries({ queryKey: queryKeys.generationStatus(args.id) });
      qc.invalidateQueries({ queryKey: ["generation-history"] });
    },
  });
}

// LoRA catalog list. Picker filters by the selected model's family;
// optional category facet. Read-only public endpoint; cache for 5 min
// since the catalog rarely changes (operator-managed).
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

// Re-uploads a chosen file to R2 (per-user prefix) and returns the URL
// the form should put into references[].url. Eden Treaty handles the
// multipart serialization from the {file} object. v1 imposes no
// per-user quota; the reference uploader caps to 6 entries via the
// validator.
export function useUploadReferenceMutation() {
  const t = useTranslations();
  return useMutation({
    mutationFn: async (file: File) =>
      handleElysia(await rpc.api.generation.references.post({ file })),
    onError: (e) => handleError(e, t),
  });
}

// ---------- Sharing / export / import / fork ----------

/** Mint a public share token for a generation the user owns. Idempotent;
 *  the server returns the existing shareId when called twice. Cache is
 *  updated so the result-row reflects the new shareId without refetching. */
export function useShareGenerationMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string }) =>
      handleElysia(
        await rpc.api.generation({ id: args.id }).share.post(),
      ),
    onError: (e) => handleError(e, t),
    onSuccess: (data, args) => {
      const prev = qc.getQueryData<{ shareId: string | null }>(
        queryKeys.generation(args.id),
      );
      if (prev) {
        qc.setQueryData(queryKeys.generation(args.id), {
          ...prev,
          shareId: data.shareId,
        });
      }
    },
  });
}

export function useRevokeShareMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string }) =>
      handleElysia(
        await rpc.api.generation({ id: args.id }).share.delete(),
      ),
    onError: (e) => handleError(e, t),
    onSuccess: (_data, args) => {
      const prev = qc.getQueryData<{ shareId: string | null }>(
        queryKeys.generation(args.id),
      );
      if (prev) {
        qc.setQueryData(queryKeys.generation(args.id), {
          ...prev,
          shareId: null,
        });
      }
    },
  });
}

/** Fetches a snapshot for the user's own generation. The caller wraps the
 *  result in a Blob + downloadable anchor; see exportGenerationToFile in
 *  src/lib/utils/generation-export.ts for the helper. */
export function useExportGenerationMutation() {
  const t = useTranslations();
  return useMutation({
    mutationFn: async (args: { id: string }) =>
      handleElysia(
        await rpc.api.generation({ id: args.id }).export.get(),
      ),
    onError: (e) => handleError(e, t),
  });
}

/** Uploads a snapshot from a JSON file and clones it into the user's
 *  account in restore or regenerate mode. Returns the new generation id. */
export function useImportGenerationMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: EdenArgs<typeof rpc.api.generation.import, "post">) =>
      handleElysia(await rpc.api.generation.import.post(args.body)),
    onError: (e) => handleError(e, t),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["generation-history"] });
    },
  });
}

/** Forks a shared generation into the visitor's account. Used by the
 *  "Save to my account" button on /shared/<shareId>. */
export function useForkSharedGenerationMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      shareId: string;
      body: { mode: "restore" | "regenerate" };
    }) =>
      handleElysia(
        await rpc.api.generation
          .shared({ shareId: args.shareId })
          .fork.post(args.body),
      ),
    onError: (e) => handleError(e, t),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["generation-history"] });
    },
  });
}

/** Public read of a shared generation by its share token. No auth. */
export function useSharedGenerationQuery(shareId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.sharedGeneration(shareId ?? ""),
    queryFn: async () =>
      handleElysia(
        await rpc.api.generation.shared({ shareId: shareId! }).get(),
      ),
    enabled: !!shareId,
    retry: false,
  });
}

export type Generation = NonNullable<GenerationDetail>;
