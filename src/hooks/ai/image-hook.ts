"use client";

import { IMAGE_SESSION_TITLE_MAX } from "@/lib/ai/image/constants";
import { RETENTION_MS } from "@/lib/config/constants";
import {
  bumpLocalSessionCounts,
  deleteLocalImageSession,
  deleteLocalImageSessionDeep,
  deleteLocalSnapshot,
  readLocalImageSession,
  readLocalSessionBundle,
  readLocalSessionPreviews,
  readLocalSnapshotBySubmittedKey,
  patchLocalSnapshotCost,
  readLocalSnapshotView,
  toSnapshotView,
  upsertLocalImageSession,
  upsertLocalSnapshot,
  upsertLocalSnapshotImages,
} from "@/lib/db/client/data/image/image";
import {
  exportLocalSession,
  importLocalSession,
} from "@/lib/db/client/data/image/image-transfer";
import type { Media } from "@/lib/db/schema/shared";
import { invalidateAndBroadcast } from "@/lib/react-query/cross-tab-invalidate";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { SnapshotView } from "@/lib/types";
import {
  imageLorasChecker,
  imageParamsChecker,
  imageReferencesChecker,
  isImageSessionFormat,
  MAX_IMAGES_PER_GEN,
  type GeneratedImage,
  type ImageCloneMode,
  type ImageSnapshotExport,
  type ImageSubmitBody,
  type SessionSnapshot,
} from "@/lib/validation/image";
import { safeParse } from "@/lib/validation/helpers";
import { fnv1aHex, handleElysia, uid } from "@/lib/utils/base";
import { logChatDebug } from "@/lib/utils/chat-debug-log";
import { handleError } from "@/lib/utils/client";
import { dayjs } from "@/lib/utils/format/date";
import {
  type QueryKey,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useTranslations } from "next-intl";

type SubmitArgs = ImageSubmitBody & { sessionId?: string };

function imageToMediaRow(
  imageSnapshotId: string,
  index: number,
  img: GeneratedImage,
): Media {
  return {
    id: uid(),
    convId: null,
    imageSnapshotId,
    sequenceIndex: index,
    upstreamResultUrl: img.resultUrl,
    r2Key: null,
    r2Url: null,
    dataBase64: img.base64,
    mimeType: img.mimeType,
    sizeBytes: img.sizeBytes,
    width: img.width,
    height: img.height,
    extractedText: null,
    focalX: null,
    focalY: null,
    promptText: null,
    seed: img.seed ?? null,
    createdAt: dayjs().toDate(),
  };
}

async function backfillSnapshotCost(
  snapshotId: string,
  sessionId: string,
  requestIds: string[],
  qc: ReturnType<typeof useQueryClient>,
): Promise<void> {
  if (!requestIds.length) return;
  for (let attempt = 0; attempt < 5; attempt++) {
    await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    let total = 0;
    let missing = false;
    for (const requestId of requestIds) {
      try {
        const row = handleElysia(
          await rpc.api.ops.logs["by-request"].get({
            query: { request_id: requestId },
          }),
        );
        if (row.quota == null) missing = true;
        else total += row.quota;
      } catch {
        missing = true;
      }
    }
    if (missing) continue;
    await patchLocalSnapshotCost(snapshotId, total);
    invalidateAndBroadcast(qc, [
      queryKeys.imageSnapshot(snapshotId),
      queryKeys.imageSession(sessionId),
    ]);
    return;
  }
}

// The time bucket is load-bearing: without it a deliberate regenerate hashes
// identically forever and is silently swallowed.
const SUBMIT_DEDUPE_WINDOW_MS = 5_000;

function submittedKeyFor(body: SubmitArgs): string {
  return fnv1aHex(
    JSON.stringify([
      body.sessionId ?? "",
      body.model,
      body.prompt,
      body.negativePrompt ?? "",
      body.params ?? null,
      body.loras ?? null,
      body.references ?? null,
      body.extraParams ?? null,
      Math.floor(Date.now() / SUBMIT_DEDUPE_WINDOW_MS),
    ]),
  );
}

export function useSessionHistoryQuery() {
  return useQuery({
    queryKey: queryKeys.imageSessionList(undefined),
    queryFn: async () => ({ items: await readLocalSessionPreviews() }),
  });
}

export function useSessionQuery(sessionId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.imageSession(sessionId ?? ""),
    queryFn: async () => {
      const bundle = await readLocalSessionBundle(sessionId!);
      if (!bundle) throw new Error("image-session-not-found");
      const snapshots = bundle.snapshots
        .map((s) => toSnapshotView(s, bundle.media))
        .sort((a, b) => b.sessionOrder - a.sessionOrder);
      return { session: bundle.session, snapshots };
    },
    enabled: !!sessionId,
    retry: false,
  });
}

export function useSnapshotQuery(id: string | null) {
  return useQuery({
    queryKey: queryKeys.imageSnapshot(id ?? ""),
    queryFn: async (): Promise<SnapshotView> => {
      const view = await readLocalSnapshotView(id!);
      if (!view) throw new Error("image-snapshot-not-found");
      return view;
    },
    enabled: !!id,
    retry: false,
  });
}

async function runSubmit(
  body: SubmitArgs,
  qc: ReturnType<typeof useQueryClient>,
): Promise<{ sessionId: string; snapshotId: string }> {
  const submittedKey = submittedKeyFor(body);
  const existing = await readLocalSnapshotBySubmittedKey(submittedKey);
  if (existing) {
    return { sessionId: existing.sessionId, snapshotId: existing.id };
  }

  const now = dayjs().toDate();
  const expiresAt = new Date(Date.now() + RETENTION_MS);

  const existingSessionId = body.sessionId ?? "";
  const existingSession = existingSessionId
    ? await readLocalImageSession(existingSessionId)
    : null;
  const sessionOrder = existingSession?.snapshotCount ?? 0;

  // Submit BEFORE creating the session row, so a failed submit leaves nothing behind.
  const result = handleElysia(await rpc.api.ai.image.submit.post(body));

  const sessionId = existingSessionId || uid();
  if (!existingSession) {
    await upsertLocalImageSession({
      id: sessionId,
      title: body.prompt.slice(0, IMAGE_SESSION_TITLE_MAX).trim() || null,
      firstModel: body.model,
      snapshotCount: 0,
      imageCount: 0,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    });
  }

  const snapshotId = uid();
  await upsertLocalSnapshot({
    id: snapshotId,
    sessionId,
    sessionOrder,
    requestedCount: Math.min(MAX_IMAGES_PER_GEN, body.params?.n ?? 1),
    model: body.model,
    prompt: body.prompt,
    negativePrompt: body.negativePrompt ?? null,
    params: body.params ?? null,
    loras: body.loras ?? null,
    references: body.references ?? null,
    extraParams: body.extraParams ?? null,
    visibility: body.visibility ?? "private",
    submittedKey,
    status: "success",
    taskId: null,
    progress: "100%",
    expiresAt,
    createdAt: now,
    updatedAt: now,
  });
  await upsertLocalSnapshotImages(
    snapshotId,
    result.images.map((img, i) => imageToMediaRow(snapshotId, i, img)),
  );

  void backfillSnapshotCost(snapshotId, sessionId, result.requestIds, qc);
  await bumpLocalSessionCounts(sessionId, {
    snapshots: 1,
    images: result.images.length,
  });
  logChatDebug("image.persist", {
    sessionId,
    snapshotId,
    images: result.images.length,
    model: body.model,
  });

  return { sessionId, snapshotId };
}

export function useSubmitGenerationMutation() {
  const t = useTranslations();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: SubmitArgs) => runSubmit(body, qc),
    onError: (e) => handleError(e, t),
    onSuccess: (data) => {
      invalidateAndBroadcast(qc, [
        queryKeys.imageSessionLists(),
        queryKeys.imageSession(data.sessionId),
        queryKeys.imageSnapshot(data.snapshotId),
      ]);
    },
  });
}

export function useDeleteSnapshotMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string }) => {
      const view = await readLocalSnapshotView(args.id);
      if (!view) return { id: args.id, sessionId: "", sessionDeleted: false };
      const sessionId = view.sessionId;
      await deleteLocalSnapshot(args.id);
      const remaining = await readLocalSessionBundle(sessionId);
      const sessionDeleted = (remaining?.snapshots.length ?? 0) === 0;
      if (sessionDeleted) {
        await deleteLocalImageSession(sessionId);
      } else {
        await bumpLocalSessionCounts(sessionId, {
          snapshots: -1,
          images: -view.images.length,
        });
      }
      return { id: args.id, sessionId, sessionDeleted };
    },
    onError: (e) => handleError(e, t),
    onSuccess: (data) => {
      const keys: QueryKey[] = [queryKeys.imageSessionLists()];
      if (data.sessionId) {
        keys.push(queryKeys.imageSession(data.sessionId));
      }
      invalidateAndBroadcast(qc, keys);
    },
  });
}

export function useDeleteImageSessionMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { sessionId: string }) => {
      await deleteLocalImageSessionDeep(args.sessionId);
      return args;
    },
    onError: (e) => handleError(e, t),
    onSuccess: (data) => {
      invalidateAndBroadcast(qc, [
        queryKeys.imageSessionLists(),
        queryKeys.imageSession(data.sessionId),
      ]);
    },
  });
}

export function useExportSessionMutation() {
  const t = useTranslations();
  return useMutation({
    mutationFn: async (args: { sessionId: string }) =>
      exportLocalSession(args.sessionId),
    onError: (e) => handleError(e, t),
  });
}

export function useImportGenerationMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      payload: ImageSnapshotExport | SessionSnapshot;
      mode: ImageCloneMode;
    }) => {
      if (args.mode === "restore") {
        return importLocalSession(args.payload);
      }
      const snapshots = isImageSessionFormat(args.payload)
        ? args.payload.snapshots
        : [args.payload];
      let sessionId = "";
      for (const snap of snapshots) {
        const params = safeParse(imageParamsChecker, snap.params);
        const loras = safeParse(imageLorasChecker, snap.loras);
        const references = safeParse(imageReferencesChecker, snap.references);
        const extras =
          snap.extraParams && typeof snap.extraParams === "object"
            ? (snap.extraParams as { air?: unknown; airName?: unknown })
            : null;
        const body: SubmitArgs = {
          model: snap.model,
          prompt: snap.prompt,
          negativePrompt: snap.negativePrompt ?? undefined,
          params: params.success ? params.data : undefined,
          loras: loras.success ? loras.data : undefined,
          references: references.success ? references.data : undefined,
          extraParams:
            typeof extras?.air === "string"
              ? {
                  air: extras.air,
                  ...(typeof extras.airName === "string"
                    ? { airName: extras.airName }
                    : {}),
                }
              : undefined,
          visibility: "private",
          sessionId: sessionId || undefined,
        };
        const result = await runSubmit(body, qc);
        sessionId = result.sessionId;
      }
      return { sessionId };
    },
    onError: (e) => handleError(e, t),
    onSuccess: () => {
      invalidateAndBroadcast(qc, [queryKeys.imageSessionLists()]);
    },
  });
}
