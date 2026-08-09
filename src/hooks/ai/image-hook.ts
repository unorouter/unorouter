"use client";

import { useLocalUserId } from "@/hooks/auth/use-local-user-id";
import { IMAGE_SESSION_TITLE_MAX } from "@/lib/ai/image/constants";
import { GUEST_USER_ID, RETENTION_MS } from "@/lib/config/constants";
import {
  bumpLocalSessionCounts,
  deleteLocalImageSession,
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
    userId: GUEST_USER_ID,
    convId: null,
    imageSnapshotId,
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
    promptText: null,
    seed: img.seed ?? null,
    createdAt: dayjs().toDate(),
  };
}

// The gateway writes its log row after answering; retry briefly, give up = no price.
async function backfillSnapshotCost(
  userId: number,
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
    await patchLocalSnapshotCost(userId, snapshotId, total);
    invalidateAndBroadcast(qc, [
      queryKeys.imageSnapshot(snapshotId),
      queryKeys.imageSession(sessionId),
    ]);
    return;
  }
}

// Content-derived dedupe key with a time bucket: collapses a double-click's second bill
// without swallowing a deliberate regenerate (content alone hashed identically forever
// and made Generate look dead). The column carries a UNIQUE index.
const SUBMIT_DEDUPE_WINDOW_MS = 5_000;

function submittedKeyFor(userId: number, body: SubmitArgs): string {
  return fnv1aHex(
    JSON.stringify([
      userId,
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
  const userId = useLocalUserId();
  return useQuery({
    queryKey: queryKeys.imageSessionList(undefined),
    queryFn: async () => ({
      items: await readLocalSessionPreviews(userId),
      nextCursor: null,
    }),
  });
}

export function useSessionQuery(sessionId: string | null | undefined) {
  const userId = useLocalUserId();
  return useQuery({
    queryKey: queryKeys.imageSession(sessionId ?? ""),
    queryFn: async () => {
      const bundle = await readLocalSessionBundle(userId, sessionId!);
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
  const userId = useLocalUserId();
  return useQuery({
    queryKey: queryKeys.imageSnapshot(id ?? ""),
    queryFn: async (): Promise<SnapshotView> => {
      const view = await readLocalSnapshotView(userId, id!);
      if (!view) throw new Error("image-snapshot-not-found");
      return view;
    },
    enabled: !!id,
    retry: false,
  });
}

async function runSubmit(
  userId: number,
  body: SubmitArgs,
  qc: ReturnType<typeof useQueryClient>,
): Promise<{ sessionId: string; snapshotId: string }> {
  const submittedKey = submittedKeyFor(userId, body);
  const existing = await readLocalSnapshotBySubmittedKey(userId, submittedKey);
  if (existing) {
    return { sessionId: existing.sessionId, snapshotId: existing.id };
  }

  const now = dayjs().toDate();
  const expiresAt = new Date(Date.now() + RETENTION_MS);

  const existingSessionId = body.sessionId ?? "";
  const existingSession = existingSessionId
    ? await readLocalImageSession(userId, existingSessionId)
    : null;
  const sessionOrder = existingSession?.snapshotCount ?? 0;

  // Submit BEFORE creating the session row, so a failed submit leaves nothing behind.
  const result = handleElysia(await rpc.api.ai.image.submit.post(body));

  const sessionId = existingSessionId || uid();
  if (!existingSession) {
    await upsertLocalImageSession(userId, {
      id: sessionId,
      userId,
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
  await upsertLocalSnapshot(userId, {
    id: snapshotId,
    userId,
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
    userId,
    snapshotId,
    result.images.map((img, i) => imageToMediaRow(snapshotId, i, img)),
  );

  // Cost is only known after the run; patched in so the image renders immediately.
  void backfillSnapshotCost(
    userId,
    snapshotId,
    sessionId,
    result.requestIds,
    qc,
  );
  await bumpLocalSessionCounts(userId, sessionId, {
    snapshots: 1,
    images: result.images.length,
  });

  return { sessionId, snapshotId };
}

export function useSubmitGenerationMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const userId = useLocalUserId();

  return useMutation({
    mutationFn: async (body: SubmitArgs) => runSubmit(userId, body, qc),
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
  const userId = useLocalUserId();
  return useMutation({
    mutationFn: async (args: { id: string }) => {
      const view = await readLocalSnapshotView(userId, args.id);
      if (!view) return { id: args.id, sessionId: "", sessionDeleted: false };
      const sessionId = view.sessionId;
      await deleteLocalSnapshot(userId, args.id);
      const remaining = await readLocalSessionBundle(userId, sessionId);
      const sessionDeleted = (remaining?.snapshots.length ?? 0) === 0;
      if (sessionDeleted) {
        await deleteLocalImageSession(userId, sessionId);
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
      const keys: QueryKey[] = [queryKeys.imageSessionLists()];
      if (data.sessionId) {
        keys.push(queryKeys.imageSession(data.sessionId));
      }
      invalidateAndBroadcast(qc, keys);
    },
  });
}

export function useExportSessionMutation() {
  const t = useTranslations();
  const userId = useLocalUserId();
  return useMutation({
    mutationFn: async (args: { sessionId: string }) =>
      exportLocalSession(userId, args.sessionId),
    onError: (e) => handleError(e, t),
  });
}

export function useImportGenerationMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const userId = useLocalUserId();
  return useMutation({
    mutationFn: async (args: {
      payload: ImageSnapshotExport | SessionSnapshot;
      mode: ImageCloneMode;
    }) => {
      if (args.mode === "restore") {
        return importLocalSession(userId, args.payload);
      }
      const snapshots = isImageSessionFormat(args.payload)
        ? args.payload.snapshots
        : [args.payload];
      let sessionId = "";
      for (const snap of snapshots) {
        // Snapshot payload fields are stored loosely for restore-lenience; regenerating
        // resubmits them, so anything that fails the schema is dropped, not forwarded.
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
        const result = await runSubmit(userId, body, qc);
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
