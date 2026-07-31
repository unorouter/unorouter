"use client";

import { useLocalUserId } from "@/hooks/auth/use-local-user-id";
import { PLAYGROUND_SESSION_TITLE_MAX } from "@/components/pages/sidebar/image/image-constants";
import { GUEST_USER_ID, RETENTION_MS } from "@/lib/config/constants";
import {
  bumpLocalSessionCounts,
  deleteLocalImageSession,
  deleteLocalSnapshot,
  readLocalImageSession,
  readLocalImageSessions,
  readLocalSessionBundle,
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
  isPlaygroundSessionFormat,
  type GeneratedImage,
  type GenerationCloneMode,
  type PlaygroundSnapshot,
  type PlaygroundSubmitBody,
  type SessionSnapshot,
} from "@/lib/validation/playground";
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

type SubmitArgs = PlaygroundSubmitBody & { sessionId?: string };

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

// The gateway writes its log row after answering, so the cost is briefly not there yet.
// A few short retries cover that; giving up just leaves the snapshot without a price.
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

// Content derived, so a double-click submits the same key twice and the second call is a
// no-op instead of a second bill. The column carries a UNIQUE index.
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
    ]),
  );
}

export function useSessionHistoryQuery() {
  const userId = useLocalUserId();
  return useQuery({
    queryKey: queryKeys.imageSessionList(undefined),
    queryFn: async () => {
      const sessions = (await readLocalImageSessions(userId)) ?? [];
      const items = await Promise.all(
        sessions.map(async (session) => {
          const bundle = await readLocalSessionBundle(userId, session.id);
          const snapshots = bundle?.snapshots ?? [];
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

  // Submit BEFORE creating the session row: a failed submit used to leave an empty
  // session behind that nothing ever cleaned up.
  const result = handleElysia(await rpc.api.ai.image.submit.post(body));

  const sessionId = existingSessionId || uid();
  if (!existingSession) {
    await upsertLocalImageSession(userId, {
      id: sessionId,
      userId,
      title: body.prompt.slice(0, PLAYGROUND_SESSION_TITLE_MAX).trim() || null,
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
    requestedCount: Math.min(4, body.params?.n ?? 1),
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

  // What a generation cost is only known after it runs, since the provider bills GPU time.
  // Patched in after the snapshot exists so the image renders immediately and a slow or
  // missing log row costs nothing but the price label.
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
        const body: SubmitArgs = {
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
