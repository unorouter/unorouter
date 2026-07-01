"use client";

import { useElysiaQuery } from "@/lib/react-query/hooks";

import { useLocalUserId } from "@/hooks/auth/use-local-user-id";
import { PLAYGROUND_SESSION_TITLE_MAX } from "@/components/pages/sidebar/playground/playground-constants";
import { GUEST_USER_ID, RETENTION_MS } from "@/lib/config/constants";
import {
  bumpLocalSessionCounts,
  deleteLocalGenerationSession,
  deleteLocalSnapshot,
  readLocalGenerationSession,
  readLocalGenerationSessionBundle,
  readLocalGenerationSessions,
  toSnapshotView,
  upsertLocalGenerationSession,
  upsertLocalSnapshot,
  upsertLocalSnapshotImages,
} from "@/lib/db/client/data/playground/playground";
import {
  exportLocalSession,
  importLocalSession,
} from "@/lib/db/client/data/playground/playground-transfer";
import type { Media, Playground } from "@/lib/db/schema/shared";
import { invalidateAndBroadcast } from "@/lib/react-query/cross-tab-invalidate";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenQuery } from "@/lib/types/eden";
import type { SnapshotView } from "@/lib/types";
import {
  isPlaygroundSessionFormat,
  type GeneratedImage,
  type GenerationCloneMode,
  type PlaygroundSnapshot,
  type PlaygroundSubmitBody,
  type SessionSnapshot,
} from "@/lib/validation/playground";
import { handleElysia, uid } from "@/lib/utils/base";
import { handleError } from "@/lib/utils/client";
import { dayjs } from "@/lib/utils/format/date";
import {
  type QueryKey,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useTranslations } from "next-intl";

// Poll cadence for async (ComfyUI task) generations; stops on terminal status.
const POLL_INTERVAL_MS = 2000;

function isTerminal(status: string | undefined): boolean {
  return status === "success" || status === "failure";
}

function imageToMediaRow(
  playgroundId: string,
  index: number,
  img: GeneratedImage,
): Media {
  return {
    id: uid(),
    userId: GUEST_USER_ID,
    convId: null,
    playgroundId,
    sequenceIndex: index,
    upstreamResultUrl: img.resultUrl,
    r2Key: null,
    r2Url: null,
    dataBase64: img.base64,
    mimeType: img.mimeType,
    sizeBytes: img.sizeBytes,
    width: null,
    height: null,
    extractedText: null,
    createdAt: dayjs().toDate(),
  };
}

export function useSessionHistoryQuery() {
  const userId = useLocalUserId();
  return useQuery({
    queryKey: queryKeys.playgroundSessionList(undefined),
    queryFn: async () => {
      const sessions = (await readLocalGenerationSessions(userId)) ?? [];
      const items = await Promise.all(
        sessions.map(async (session) => {
          const bundle = await readLocalGenerationSessionBundle(
            userId,
            session.id,
          );
          const snapshots = bundle?.playgrounds ?? [];
          const latest = snapshots[snapshots.length - 1] ?? null;
          const latestView = latest
            ? toSnapshotView(latest, bundle?.media ?? [])
            : null;
          return {
            session,
            latestSnapshot: latestView,
            latestImage: latestView?.images[0] ?? null,
          };
        }),
      );
      return { items, nextCursor: null };
    },
  });
}

export function useSessionQuery(sessionId: string | null | undefined) {
  const userId = useLocalUserId();
  return useQuery({
    queryKey: queryKeys.playgroundSession(sessionId ?? ""),
    queryFn: async () => {
      const bundle = await readLocalGenerationSessionBundle(userId, sessionId!);
      if (!bundle) throw new Error("playground-session-not-found");
      // Newest-first to match the result view's snapshot navigation.
      const snapshots = bundle.playgrounds
        .map((s) => toSnapshotView(s, bundle.media))
        .sort((a, b) => b.sessionOrder - a.sessionOrder);
      return { session: bundle.session, snapshots };
    },
    enabled: !!sessionId,
    retry: false,
  });
}

// Used by the form's seed lookup.
export function useSnapshotQuery(id: string | null) {
  const userId = useLocalUserId();
  return useQuery({
    queryKey: queryKeys.playgroundSnapshot(id ?? ""),
    queryFn: async (): Promise<SnapshotView> => {
      const view = await readLocalGenerationSessionBundleForSnapshot(
        userId,
        id!,
      );
      if (!view) throw new Error("playground-snapshot-not-found");
      return view;
    },
    enabled: !!id,
    retry: false,
  });
}

async function readLocalGenerationSessionBundleForSnapshot(
  userId: number,
  snapshotId: string,
): Promise<SnapshotView | null> {
  const sessions = (await readLocalGenerationSessions(userId)) ?? [];
  for (const session of sessions) {
    const bundle = await readLocalGenerationSessionBundle(userId, session.id);
    const match = bundle?.playgrounds?.find((s) => s.id === snapshotId);
    if (match && bundle) return toSnapshotView(match, bundle.media);
  }
  return null;
}

// Polls async snapshots; finalizes image rows + counts on success.
export function useSnapshotStatusQuery(
  id: string | null | undefined,
  enabled = true,
) {
  const t = useTranslations();
  const userId = useLocalUserId();
  const qc = useQueryClient();
  return useQuery({
    queryKey: queryKeys.playgroundSnapshotStatus(id ?? ""),
    queryFn: async (): Promise<SnapshotView | null> => {
      const view = await readLocalGenerationSessionBundleForSnapshot(
        userId,
        id!,
      );
      if (!view) return null;
      if (isTerminal(view.status) || !view.taskId) return view;

      try {
        const poll = handleElysia(
          await rpc.api.ai.playground.poll.post({ taskId: view.taskId }),
        );
        if (poll.status === "success" && "images" in poll) {
          await upsertLocalSnapshotImages(
            userId,
            view.id,
            poll.images.map((img, i) => imageToMediaRow(view.id, i, img)),
          );
          await upsertLocalSnapshot(userId, {
            ...(await snapshotRow(userId, view)),
            status: "success",
            progress: poll.progress,
            updatedAt: dayjs().toDate(),
          });
          await bumpLocalSessionCounts(userId, view.sessionId, {
            images: poll.images.length,
          });
        } else if (poll.status === "failure" && "errorMessage" in poll) {
          await upsertLocalSnapshot(userId, {
            ...(await snapshotRow(userId, view)),
            status: "failure",
            errorMessage: poll.errorMessage,
            updatedAt: dayjs().toDate(),
          });
        } else {
          await upsertLocalSnapshot(userId, {
            ...(await snapshotRow(userId, view)),
            status: poll.status,
            progress: poll.progress,
            updatedAt: dayjs().toDate(),
          });
        }
        if (isTerminal(poll.status)) {
          invalidateAndBroadcast(qc, [
            queryKeys.playgroundSession(view.sessionId),
          ]);
        }
      } catch (e) {
        handleError(e, t);
      }
      return readLocalGenerationSessionBundleForSnapshot(userId, id!);
    },
    enabled: enabled && !!id,
    retry: false,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return isTerminal(status) ? false : POLL_INTERVAL_MS;
    },
    refetchIntervalInBackground: true,
  });
}

// Re-read raw row so updates don't drop columns.
async function snapshotRow(
  userId: number,
  view: SnapshotView,
): Promise<Playground> {
  const bundle = await readLocalGenerationSessionBundle(userId, view.sessionId);
  const row = bundle?.playgrounds?.find((s) => s.id === view.id);
  if (!row) throw new Error("playground-snapshot-row-missing");
  return row;
}

// Run submit + write session/snapshot/media locally. Shared by submit + import-regenerate.
async function runSubmit(
  userId: number,
  body: PlaygroundSubmitBody & { sessionId?: string },
): Promise<{ sessionId: string; snapshotId: string }> {
  const now = dayjs().toDate();
  const expiresAt = new Date(Date.now() + RETENTION_MS);

  let sessionId = body.sessionId ?? "";
  let sessionOrder = 0;
  if (sessionId) {
    const existing = await readLocalGenerationSession(userId, sessionId);
    sessionOrder = existing?.snapshotCount ?? 0;
  } else {
    sessionId = uid();
    await upsertLocalGenerationSession(userId, {
      id: sessionId,
      userId,
      title: body.prompt.slice(0, PLAYGROUND_SESSION_TITLE_MAX).trim() || null,
      firstModel: body.model,
      snapshotCount: 0,
      imageCount: 0,
      expiresAt,
      syncExpiresAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  const snapshotId = uid();
  const requestedCount = Math.min(4, body.params?.n ?? 1);
  const result = handleElysia(await rpc.api.ai.playground.submit.post(body));

  const baseSnapshot = {
    id: snapshotId,
    userId,
    sessionId,
    sessionOrder,
    requestedCount,
    model: body.model,
    prompt: body.prompt,
    negativePrompt: body.negativePrompt ?? null,
    params: body.params ?? null,
    loras: body.loras ?? null,
    references: body.references ?? null,
    extraParams: body.extraParams ?? null,
    visibility: body.visibility ?? "private",
    expiresAt,
    createdAt: now,
    updatedAt: now,
  };

  if (result.kind === "sync") {
    await upsertLocalSnapshot(userId, {
      ...baseSnapshot,
      status: "success",
      taskId: null,
      progress: "100%",
    });
    await upsertLocalSnapshotImages(
      userId,
      snapshotId,
      result.images.map((img, i) => imageToMediaRow(snapshotId, i, img)),
    );
    await bumpLocalSessionCounts(userId, sessionId, {
      snapshots: 1,
      images: result.images.length,
    });
  } else {
    await upsertLocalSnapshot(userId, {
      ...baseSnapshot,
      status: result.status,
      taskId: result.taskId,
      progress: "10%",
    });
    await bumpLocalSessionCounts(userId, sessionId, { snapshots: 1 });
  }

  return { sessionId, snapshotId };
}

export function useSubmitGenerationMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const userId = useLocalUserId();

  return useMutation({
    mutationFn: async (body: PlaygroundSubmitBody & { sessionId?: string }) =>
      runSubmit(userId, body),
    onError: (e) => handleError(e, t),
    onSuccess: (data) => {
      invalidateAndBroadcast(qc, [
        queryKeys.playgroundSessionLists(),
        queryKeys.playgroundSession(data.sessionId),
        queryKeys.playgroundSnapshotStatus(data.snapshotId),
      ]);
    },
  });
}

export function useDeleteSnapshotMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const userId = useLocalUserId();
  return useMutation({
    mutationFn: async (args: { id: string }) => {
      const view = await readLocalGenerationSessionBundleForSnapshot(
        userId,
        args.id,
      );
      if (!view) return { id: args.id, sessionId: "", sessionDeleted: false };
      const sessionId = view.sessionId;
      await deleteLocalSnapshot(userId, args.id);
      const remaining = await readLocalGenerationSessionBundle(
        userId,
        sessionId,
      );
      const sessionDeleted = (remaining?.playgrounds.length ?? 0) === 0;
      if (sessionDeleted) {
        await deleteLocalGenerationSession(userId, sessionId);
      } else {
        await bumpLocalSessionCounts(userId, sessionId, {
          snapshots: -1,
          images: -view.images.length,
        });
      }
      return { id: args.id, sessionId, sessionDeleted };
    },
    onError: (e) => handleError(e, t),
    onSuccess: (data) => {
      const keys: QueryKey[] = [queryKeys.playgroundSessionLists()];
      if (data.sessionId) {
        keys.push(queryKeys.playgroundSession(data.sessionId));
      }
      invalidateAndBroadcast(qc, keys);
    },
  });
}

// Reads a session's local bundle into a portable JSON payload (base64 images).
export function useExportSessionMutation() {
  const t = useTranslations();
  const userId = useLocalUserId();
  return useMutation({
    mutationFn: async (args: { sessionId: string }) => {
      return exportLocalSession(userId, args.sessionId);
    },
    onError: (e) => handleError(e, t),
  });
}

// restore rebuilds locally; regenerate re-runs each snapshot.
export function useImportGenerationMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const userId = useLocalUserId();
  return useMutation({
    mutationFn: async (args: {
      payload: PlaygroundSnapshot | SessionSnapshot;
      mode: GenerationCloneMode;
    }) => {
      if (args.mode === "restore") {
        return importLocalSession(userId, args.payload);
      }
      const snapshots = isPlaygroundSessionFormat(args.payload)
        ? args.payload.snapshots
        : [args.payload];
      let sessionId = "";
      for (const snap of snapshots) {
        const body: PlaygroundSubmitBody & { sessionId?: string } = {
          model: snap.model,
          prompt: snap.prompt,
          negativePrompt: snap.negativePrompt ?? undefined,
          params: snap.params as PlaygroundSubmitBody["params"],
          loras: snap.loras as PlaygroundSubmitBody["loras"],
          references: snap.references as PlaygroundSubmitBody["references"],
          extraParams: snap.extraParams as Record<string, unknown> | undefined,
          visibility: "private",
          sessionId: sessionId || undefined,
        };
        const result = await runSubmit(userId, body);
        sessionId = result.sessionId;
      }
      return { sessionId };
    },
    onError: (e) => handleError(e, t),
    onSuccess: () => {
      invalidateAndBroadcast(qc, [queryKeys.playgroundSessionLists()]);
    },
  });
}

export function useLoraCatalogQuery(
  query?: EdenQuery<typeof rpc.api.ai.playground.loras>,
) {
  return useElysiaQuery(queryKeys.loraCatalog(query), () =>
    rpc.api.ai.playground.loras.get({ query }),
  );
}

export function useEmbeddingCatalogQuery(
  query?: EdenQuery<typeof rpc.api.ai.playground.embeddings>,
) {
  return useElysiaQuery(queryKeys.embeddingCatalog(query), () =>
    rpc.api.ai.playground.embeddings.get({ query }),
  );
}

export function useUpscalerCatalogQuery(
  query?: EdenQuery<typeof rpc.api.ai.playground.upscalers>,
) {
  return useElysiaQuery(queryKeys.upscalerCatalog(query), () =>
    rpc.api.ai.playground.upscalers.get({ query }),
  );
}

export function useUploadReferenceMutation() {
  const t = useTranslations();
  return useMutation({
    mutationFn: async (file: File) =>
      handleElysia(await rpc.api.ai.playground.references.post({ file })),
    onError: (e) => handleError(e, t),
  });
}

// Routes /masks not /references for mask-specific validation later.
export function useUploadMaskMutation() {
  const t = useTranslations();
  return useMutation({
    mutationFn: async (file: File) =>
      handleElysia(await rpc.api.ai.playground.masks.post({ file })),
    onError: (e) => handleError(e, t),
  });
}
