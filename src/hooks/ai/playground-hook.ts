"use client";

import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { mirrorSessionIfSynced, unmirrorIfSynced } from "@/hooks/ai/rp/shared";
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
} from "@/lib/db/client/data/playground";
import {
  exportLocalSession,
  importLocalSession,
} from "@/lib/db/client/data/playground-transfer";
import type { Media, Playground } from "@/lib/db/schema/shared";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenQuery } from "@/lib/types/eden";
import type { SnapshotView } from "@/lib/types";
import type {
  GeneratedImage,
  GenerationCloneMode,
  PlaygroundSnapshot,
  PlaygroundSubmitBody,
  SessionSnapshot,
} from "@/lib/validation/playground";
import { handleElysia, uid } from "@/lib/utils/base";
import { handleError } from "@/lib/utils/client";
import { dayjs } from "@/lib/utils/format/date";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

// Poll cadence for async (ComfyUI task) generations; stops on terminal status.
const POLL_INTERVAL_MS = 2000;

function isTerminal(status: string | undefined): boolean {
  return status === "success" || status === "failure";
}

// Maps a server-returned base64 image into a local `media` insert row.
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
  const auth = useAuthQuery();
  return useQuery({
    queryKey: queryKeys.playgroundSessionList(undefined),
    queryFn: async () => {
      const userId = auth.data?.id ?? GUEST_USER_ID;
      const sessions = (await readLocalGenerationSessions(userId)) ?? [];
      const items = await Promise.all(
        sessions.map(async (session) => {
          const bundle = await readLocalGenerationSessionBundle(
            userId,
            session.id,
          );
          const snapshots = (bundle?.playgrounds ?? []) as Playground[];
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
  const auth = useAuthQuery();
  return useQuery({
    queryKey: queryKeys.playgroundSession(sessionId ?? ""),
    queryFn: async () => {
      const userId = auth.data?.id ?? GUEST_USER_ID;
      const bundle = await readLocalGenerationSessionBundle(
        userId,
        sessionId!,
      );
      if (!bundle) throw new Error("playground-session-not-found");
      // Newest-first to match the result view's snapshot navigation.
      const snapshots = (bundle.playgrounds as Playground[])
        .map((s) => toSnapshotView(s, bundle.media))
        .sort((a, b) => b.sessionOrder - a.sessionOrder);
      return { session: bundle.session, snapshots };
    },
    enabled: !!sessionId,
    retry: false,
  });
}

// Single snapshot read; the form's "seed" lookup uses this.
export function useSnapshotQuery(id: string | null) {
  const auth = useAuthQuery();
  return useQuery({
    queryKey: queryKeys.playgroundSnapshot(id ?? ""),
    queryFn: async (): Promise<SnapshotView> => {
      const userId = auth.data?.id ?? GUEST_USER_ID;
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

// Helper: resolve a snapshot view by snapshot id (walks its session bundle).
async function readLocalGenerationSessionBundleForSnapshot(
  userId: number,
  snapshotId: string,
): Promise<SnapshotView | null> {
  const sessions = (await readLocalGenerationSessions(userId)) ?? [];
  for (const session of sessions) {
    const bundle = await readLocalGenerationSessionBundle(userId, session.id);
    const match = (bundle?.playgrounds as Playground[] | undefined)?.find(
      (s) => s.id === snapshotId,
    );
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
  const auth = useAuthQuery();
  const qc = useQueryClient();
  return useQuery({
    queryKey: queryKeys.playgroundSnapshotStatus(id ?? ""),
    queryFn: async (): Promise<SnapshotView | null> => {
      const userId = auth.data?.id ?? GUEST_USER_ID;
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
          await mirrorSessionIfSynced(userId, view.sessionId);
          qc.invalidateQueries({
            queryKey: queryKeys.playgroundSession(view.sessionId),
          });
        }
      } catch (e) {
        handleError(e, t);
      }
      return readLocalGenerationSessionBundleForSnapshot(userId, id!);
    },
    enabled: enabled && !!id,
    retry: false,
    refetchInterval: (query) => {
      const status = (query.state.data as SnapshotView | null | undefined)
        ?.status;
      return isTerminal(status) ? false : POLL_INTERVAL_MS;
    },
    refetchIntervalInBackground: true,
  });
}

// Re-reads the raw playground row so an update keeps every column.
async function snapshotRow(
  userId: number,
  view: SnapshotView,
): Promise<Playground> {
  const bundle = await readLocalGenerationSessionBundle(
    userId,
    view.sessionId,
  );
  const row = (bundle?.playgrounds as Playground[] | undefined)?.find(
    (s) => s.id === view.id,
  );
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

  // Resolve (or create) the parent session.
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
      title: body.prompt.slice(0, 60).trim() || null,
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

  await mirrorSessionIfSynced(userId, sessionId);
  return { sessionId, snapshotId };
}

export function useSubmitGenerationMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();

  return useMutation({
    mutationFn: async (body: PlaygroundSubmitBody & { sessionId?: string }) =>
      runSubmit(auth.data?.id ?? GUEST_USER_ID, body),
    onError: (e) => handleError(e, t),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.playgroundSessionLists() });
      qc.invalidateQueries({
        queryKey: queryKeys.playgroundSession(data.sessionId),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.playgroundSnapshotStatus(data.snapshotId),
      });
    },
  });
}

export function useDeleteSnapshotMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (args: { id: string }) => {
      const userId = auth.data?.id ?? GUEST_USER_ID;
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
      const session = await readLocalGenerationSession(userId, sessionId);
      const wasSynced = session?.syncExpiresAt != null;
      if (sessionDeleted) {
        await deleteLocalGenerationSession(userId, sessionId);
        await unmirrorIfSynced(
          userId,
          "playgroundSessions",
          sessionId,
          wasSynced,
        );
      } else {
        await bumpLocalSessionCounts(userId, sessionId, {
          snapshots: -1,
          images: -view.images.length,
        });
        await mirrorSessionIfSynced(userId, sessionId);
      }
      return { id: args.id, sessionId, sessionDeleted };
    },
    onError: (e) => handleError(e, t),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.playgroundSessionLists() });
      qc.invalidateQueries({ queryKey: queryKeys.syncState() });
      if (data.sessionId) {
        qc.invalidateQueries({
          queryKey: queryKeys.playgroundSession(data.sessionId),
        });
      }
    },
  });
}

// Reads a session's local bundle into a portable JSON payload (base64 images).
export function useExportSessionMutation() {
  const t = useTranslations();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (args: { sessionId: string }) => {
      const userId = auth.data?.id ?? GUEST_USER_ID;
      return exportLocalSession(userId, args.sessionId);
    },
    onError: (e) => handleError(e, t),
  });
}

// restore rebuilds locally; regenerate re-runs each snapshot.
export function useImportGenerationMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (args: {
      payload: PlaygroundSnapshot | SessionSnapshot;
      mode: GenerationCloneMode;
    }) => {
      const userId = auth.data?.id ?? GUEST_USER_ID;
      if (args.mode === "restore") {
        return importLocalSession(userId, args.payload);
      }
      const snapshots =
        args.payload.version === "unorouter-session-1"
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
      qc.invalidateQueries({ queryKey: queryKeys.playgroundSessionLists() });
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
