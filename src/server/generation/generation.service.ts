import { getV1VideoGenerationsTaskId, postV1VideoGenerations } from "@/openapi";
import {
  buildBody,
  extractResultUris,
  fetchAllRefs,
} from "@/lib/api/generation-dispatch";
import {
  getModelEndpointTypes,
  getModelFixedPrice,
  getModelMetadata,
} from "@/lib/api/pricing-cache";
import {
  isTerminalTaskStatus,
  normalizeTaskStatus,
  unwrapTaskData,
  type UpstreamFetchResp,
  type UpstreamSubmitResp,
} from "@/lib/api/video-task";
import { dollarsToQuota, msg } from "@/lib/config/constants";
import {
  deleteGenerationObject,
  downloadAndUploadGeneration,
} from "@/lib/config/r2";
import {
  chooseEndpoint,
  type SyncImageEndpoint,
} from "@/lib/config/generation-models-dynamic";
import { assertFound } from "@/lib/db/assertions";
import { getDb } from "@/lib/db/client";
import {
  generationImages,
  generationSessions,
  generations,
  upscalerCatalog,
  type Generation,
  type GenerationImage,
  type GenerationSession,
} from "@/lib/db/schema";
import { uid } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import type {
  GenerationHistoryQuery,
  GenerationSubmitBody,
  GenerationVisibility,
} from "@/lib/validation/generation";
import { upstreamApiUrl } from "@/server/constants";
import dayjs from "dayjs";
import { and, asc, desc, eq, inArray, lt, sql } from "drizzle-orm";

// Retention window: a session (and all its snapshots/images) is removed by
// the background sweeper once it crosses this age without new activity.
// Every fresh snapshot extends `expiresAt = now + RETENTION_MS`, so an
// actively used session never expires.
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

// Cap on per-snapshot images. Must stay aligned with the form's
// variants buttons (1/2/4) and validator's generationParams.n bounds.
const MAX_IMAGES_PER_GEN = 4;

// ComfyUI templates live behind new-api's task adapter (channel type 59);
// they aren't in /api/pricing as image models. Treat them as "comfyui-task"
// when resolving the submission shape.
const COMFYUI_TEMPLATE_IDS = new Set([
  "pony",
  "endgame",
  "comfyui-sdxl-txt2img-lora",
  "flux2-dev",
  "flux2-dev-compose",
]);

type ResolvedEndpoint =
  | { kind: "comfyui-task" }
  | { kind: "sync"; endpoint: SyncImageEndpoint };

async function resolveSubmissionEndpoint(
  model: string,
): Promise<ResolvedEndpoint> {
  if (COMFYUI_TEMPLATE_IDS.has(model)) return { kind: "comfyui-task" };
  const types = await getModelEndpointTypes(model);
  if (!types) {
    throw new Error(`model ${model} not in catalog`);
  }
  const endpoint = chooseEndpoint(types);
  if (!endpoint) {
    throw new Error(`model ${model} declares no supported endpoint`);
  }
  return { kind: "sync", endpoint };
}

// ---------- Row-finalize helpers. All terminal writes share the same
// invariants: clear submittedKey (so the sweeper stops polling), bump
// updatedAt, set the row to a terminal status. The success path also
// inserts one generation_images row per produced image in the same
// transaction so consumers don't see a half-populated row, and bumps the
// parent session's denormalized imageCount. ----------

type R2Uploaded = {
  url: string;
  key: string;
  mime: string;
  sizeBytes: number;
};

type ImagePayload = {
  /** The upstream-returned URI or data: blob we downloaded from. */
  resultUri: string;
  uploaded: R2Uploaded;
};

function paramsToSize(params: GenerationSubmitBody["params"]): string | undefined {
  const p = params ?? {};
  return p.width && p.height ? `${p.width}x${p.height}` : undefined;
}

function imageCountFor(body: GenerationSubmitBody): number {
  const n = body.params?.n ?? 1;
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(MAX_IMAGES_PER_GEN, Math.floor(n));
}

async function finalizeRowSuccess(
  db: ReturnType<typeof getDb>,
  id: string,
  sessionId: string,
  images: ImagePayload[],
  progress: string = "100%",
) {
  if (images.length === 0) {
    throw new Error("finalizeRowSuccess called with no images");
  }
  await db.transaction(async (tx) => {
    // Clear any prior partial inserts from a retry. The (generationId,
    // sequenceIndex) PK would otherwise reject the re-insert.
    await tx
      .delete(generationImages)
      .where(eq(generationImages.generationId, id));
    await tx.insert(generationImages).values(
      images.map((img, idx) => ({
        generationId: id,
        sequenceIndex: idx,
        upstreamResultUrl: img.resultUri.startsWith("data:")
          ? null
          : img.resultUri,
        r2Url: img.uploaded.url,
        r2Key: img.uploaded.key,
        mimeType: img.uploaded.mime,
        sizeBytes: img.uploaded.sizeBytes,
      })),
    );
    await tx
      .update(generations)
      .set({
        status: "success",
        progress,
        submittedKey: null,
        updatedAt: dayjs().toDate(),
      })
      .where(eq(generations.id, id));
    // Bump the parent session's denormalized image count + bump updatedAt
    // so the session list re-sorts.
    await tx
      .update(generationSessions)
      .set({
        imageCount: sql`${generationSessions.imageCount} + ${images.length}`,
        updatedAt: dayjs().toDate(),
      })
      .where(eq(generationSessions.id, sessionId));
  });
}

async function finalizeRowFailure(
  db: ReturnType<typeof getDb>,
  id: string,
  errorMessage: string,
  opts?: { progress?: string },
) {
  await db
    .update(generations)
    .set({
      status: "failure",
      errorMessage: errorMessage.slice(0, 500),
      submittedKey: null,
      ...(opts?.progress !== undefined && { progress: opts.progress }),
      updatedAt: dayjs().toDate(),
    })
    .where(eq(generations.id, id));
}

// ---------------------------------------------------------------------------
// Submit + dispatch
// ---------------------------------------------------------------------------

export async function submitGeneration(
  userId: number,
  apiKey: string,
  body: GenerationSubmitBody & { sessionId?: string },
) {
  const db = getDb();
  const visibility = body.visibility ?? "private";
  const nsfw = body.nsfw ?? true;
  const requestedCount = imageCountFor(body);
  const costQuota =
    dollarsToQuota(await getModelFixedPrice(body.model)) * requestedCount;
  const now = Date.now();
  const expiresAt = new Date(now + RETENTION_MS);

  // Resolve the parent session. If the client sent a sessionId, append to
  // it (verify ownership). Otherwise create a fresh session that this
  // snapshot opens.
  let sessionId: string;
  let sessionOrder: number;
  let createdSession: GenerationSession | undefined;
  if (body.sessionId) {
    const existing = await getSessionRow(userId, body.sessionId);
    sessionId = existing.id;
    sessionOrder = existing.snapshotCount;
  } else {
    sessionId = uid();
    sessionOrder = 0;
    const title = body.prompt.slice(0, 60).trim() || null;
    await db.insert(generationSessions).values({
      id: sessionId,
      userId,
      title,
      firstModel: body.model,
      snapshotCount: 0,
      imageCount: 0,
      expiresAt,
    });
    createdSession = (
      await db
        .select()
        .from(generationSessions)
        .where(eq(generationSessions.id, sessionId))
        .limit(1)
    )[0];
  }

  const id = uid();
  await db.insert(generations).values({
    id,
    userId,
    sessionId,
    sessionOrder,
    requestedCount,
    model: body.model,
    prompt: body.prompt,
    negativePrompt: body.negativePrompt,
    params: body.params ?? null,
    loras: body.loras ?? null,
    references: body.references ?? null,
    extraParams: body.extraParams ?? null,
    status: "pending",
    visibility,
    nsfw,
    costQuota,
    expiresAt,
    submittedKey: apiKey,
  });

  // Bump the session counters + extend retention. Append-only counter
  // bumps stay safe under concurrent submits (SQL increment).
  await db
    .update(generationSessions)
    .set({
      snapshotCount: sql`${generationSessions.snapshotCount} + 1`,
      expiresAt,
      updatedAt: dayjs().toDate(),
    })
    .where(eq(generationSessions.id, sessionId));

  const resolved = await resolveSubmissionEndpoint(body.model);

  try {
    if (resolved.kind === "comfyui-task") {
      await submitComfyUITask({ db, id, sessionId, apiKey, body, n: requestedCount });
    } else {
      await submitSyncImage({
        db,
        id,
        sessionId,
        apiKey,
        body,
        endpoint: resolved.endpoint,
        n: requestedCount,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("generation submit failed", {
      context: "generation.submit",
      generationId: id,
      sessionId,
      model: body.model,
      err: message,
    });
    await finalizeRowFailure(db, id, message);
    throw err;
  }

  const snapshot = await getSnapshotWithImages(userId, id);
  // Fetch session fresh so the response includes the latest counts after
  // the bumps above.
  const session = createdSession
    ? (
        await db
          .select()
          .from(generationSessions)
          .where(eq(generationSessions.id, sessionId))
          .limit(1)
      )[0]
    : (
        await db
          .select()
          .from(generationSessions)
          .where(eq(generationSessions.id, sessionId))
          .limit(1)
      )[0];
  return { session, snapshot };
}

async function submitComfyUITask(args: {
  db: ReturnType<typeof getDb>;
  id: string;
  sessionId: string;
  apiKey: string;
  body: GenerationSubmitBody;
  n: number;
}) {
  const { db, id, apiKey, body, n } = args;
  const params = body.params ?? {};
  const size = paramsToSize(body.params);
  const extra: Record<string, unknown> = {};
  if (params.steps !== undefined) extra.steps = params.steps;
  if (params.cfg !== undefined) extra.cfg = params.cfg;
  if (params.guidance !== undefined) extra.cfg = params.guidance;
  if (params.seed !== undefined) extra.seed = params.seed;
  if (params.denoise !== undefined) extra.denoise = params.denoise;
  if (params.hiresDenoise !== undefined || params.hiresUpscale !== undefined) {
    const hires: Record<string, unknown> = {};
    if (params.hiresDenoise !== undefined) hires.denoise = params.hiresDenoise;
    if (params.hiresUpscale !== undefined) hires.upscale_by = params.hiresUpscale;
    extra.hires = hires;
  }
  extra.n = n;
  if (body.loras && body.loras.length > 0) extra.loras = body.loras;
  if (body.references && body.references.length > 0)
    extra.references = body.references;

  // Studio sub-mode + advanced knobs. Each writes to the upstream `extra`
  // block under a snake_case key the new-api ComfyUI adapter recognizes.
  // Adapter source of truth: relay/channel/task/comfyui/adaptor.go.
  if (params.initImageUrl) extra.init_image_url = params.initImageUrl;
  if (params.maskUrl) extra.mask_url = params.maskUrl;

  // Upscaler: the form sends `upscalerMultiplier` as the FINAL desired
  // multiplier (1..4). Templates run UpscaleModelLoader (native scale,
  // typically 4x) then ImageScaleBy(scale_by). To get a final multiplier
  // of M with a model of native N, we need scale_by = M / N. We resolve
  // the upscaler's nativeScale from the catalog here so the adapter
  // doesn't need a DB roundtrip.
  if (params.upscaler) {
    extra.upscaler = params.upscaler;
    const rows = await args.db
      .select({ nativeScale: upscalerCatalog.nativeScale })
      .from(upscalerCatalog)
      .where(eq(upscalerCatalog.filename, params.upscaler))
      .limit(1);
    const native = Number(rows[0]?.nativeScale ?? 4);
    const desired = params.upscalerMultiplier ?? 1;
    extra.upscaler_scale_by = native > 0 ? desired / native : 1;
    extra.upscaler_multiplier = desired;
  }
  if (params.hiresSteps !== undefined) extra.hires_steps = params.hiresSteps;

  // Embeddings: the worker rewrites the prompt to inject
  // `(embedding:<filename>:<weight>)` tokens. Filename (with extension)
  // is mandatory for weight syntax — ComfyUI tokenizer errors on a bare
  // name when a weight is set.
  if (params.embeddings && params.embeddings.length > 0)
    extra.embeddings = params.embeddings;

  // ControlNet: { kind, imageUrl, weight }. The adapter rehosts the
  // image into the workflow's extras.Images before patching the workflow.
  if (params.controlNet) extra.control_net = params.controlNet;

  // Layer Diffusion: weight 0 is a no-op; non-zero rewires SaveImage to
  // the LayeredDiffusionDecodeRGBA output.
  if (params.layerDiffusion) extra.layer_diffusion = params.layerDiffusion;

  // ADetailer subform — the full nested object.
  if (params.adetailer) extra.adetailer = params.adetailer;

  // SDXL Advanced Settings.
  if (params.clipSkip !== undefined) extra.clip_skip = params.clipSkip;
  if (params.ensd !== undefined) extra.ensd = params.ensd;

  const metadata: Record<string, unknown> = {};
  if (body.negativePrompt) metadata.negative_prompt = body.negativePrompt;
  if (Object.keys(extra).length > 0) metadata.extra = extra;

  const upstreamBody: Record<string, unknown> = {
    model: body.model,
    prompt: body.prompt,
  };
  if (size) upstreamBody.size = size;
  if (Object.keys(metadata).length > 0) upstreamBody.metadata = metadata;

  const res = await postV1VideoGenerations({
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(upstreamBody),
  });
  const payload = unwrapTaskData<UpstreamSubmitResp>(res.data);
  const taskId = payload?.task_id ?? payload?.id;
  if (!taskId) {
    throw new Error(msg("ERRORS.NO_TASK_ID"));
  }
  await db
    .update(generations)
    .set({
      taskId,
      status: normalizeTaskStatus(payload?.status),
      progress: "10%",
      updatedAt: dayjs().toDate(),
    })
    .where(eq(generations.id, id));
}

async function submitSyncImage(args: {
  db: ReturnType<typeof getDb>;
  id: string;
  sessionId: string;
  apiKey: string;
  body: GenerationSubmitBody;
  endpoint: SyncImageEndpoint;
  n: number;
}) {
  const { db, id, sessionId, apiKey, body, endpoint, n } = args;
  const params = body.params ?? {};
  const size = paramsToSize(body.params);

  const meta = await getModelMetadata(body.model);
  const cap = meta.maxImageInputs ?? 6;
  const refUrls = (body.references ?? []).slice(0, cap).map((r) => r.url);
  const refs = refUrls.length > 0 ? await fetchAllRefs(refUrls) : [];

  const supportsNativeBatch = endpoint === "image-generation";
  const callsToMake = supportsNativeBatch ? 1 : n;
  const perCallN = supportsNativeBatch ? n : 1;

  const collected: ImagePayload[] = [];
  for (let i = 0; i < callsToMake; i++) {
    const built = buildBody(endpoint, {
      model: body.model,
      prompt: body.prompt,
      size,
      refs,
      n: perCallN,
      quality: params.quality,
      outputFormat: params.outputFormat,
      watermark: params.watermark,
      background: params.background,
      strength: params.strength,
      seed: params.seed,
    });

    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
    };
    let res: Response;
    if (built.kind === "json") {
      headers["Content-Type"] = "application/json";
      res = await fetch(`${upstreamApiUrl}${built.path}`, {
        method: "POST",
        headers,
        body: built.body,
      });
    } else {
      res = await fetch(`${upstreamApiUrl}${built.path}`, {
        method: "POST",
        headers,
        body: built.form,
      });
    }

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`upstream ${res.status}: ${text.slice(0, 300)}`);
    }
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error(`upstream returned non-JSON: ${text.slice(0, 200)}`);
    }

    const uris = extractResultUris(endpoint, payload);
    if (uris.length === 0) {
      throw new Error(
        `no image in upstream response (${endpoint}): ${text.slice(0, 200)}`,
      );
    }
    for (const uri of uris) {
      const uploaded = await downloadAndUploadGeneration(uri, id, apiKey);
      collected.push({ resultUri: uri, uploaded });
      if (!supportsNativeBatch && collected.length < n) {
        await db
          .update(generations)
          .set({
            status: "in_progress",
            progress: `${collected.length}/${n}`,
            updatedAt: dayjs().toDate(),
          })
          .where(eq(generations.id, id));
      }
    }
  }

  await finalizeRowSuccess(db, id, sessionId, collected);
}

// ---------------------------------------------------------------------------
// Reads: snapshots and sessions
// ---------------------------------------------------------------------------

async function getSnapshotRow(userId: number, id: string): Promise<Generation> {
  const db = getDb();
  const rows = await db
    .select()
    .from(generations)
    .where(and(eq(generations.id, id), eq(generations.userId, userId)))
    .limit(1);
  assertFound(rows);
  return rows[0];
}

export async function getSnapshotWithImages(userId: number, id: string) {
  const row = await getSnapshotRow(userId, id);
  const images = await listGenerationImages(id);
  return { ...row, images };
}

async function listGenerationImages(
  generationId: string,
): Promise<GenerationImage[]> {
  const db = getDb();
  return db
    .select()
    .from(generationImages)
    .where(eq(generationImages.generationId, generationId))
    .orderBy(asc(generationImages.sequenceIndex));
}

async function getSessionRow(
  userId: number,
  sessionId: string,
): Promise<GenerationSession> {
  const db = getDb();
  const rows = await db
    .select()
    .from(generationSessions)
    .where(
      and(
        eq(generationSessions.id, sessionId),
        eq(generationSessions.userId, userId),
      ),
    )
    .limit(1);
  assertFound(rows);
  return rows[0];
}

/** Full session payload for the chevron view: the session row + every
 *  snapshot it contains, newest first, each with its images bulk-loaded. */
export async function getSession(userId: number, sessionId: string) {
  const session = await getSessionRow(userId, sessionId);
  const snapshots = await listSnapshotsWithImages(sessionId);
  return { session, snapshots };
}

async function listSnapshotsWithImages(sessionId: string) {
  const db = getDb();
  const snaps = await db
    .select()
    .from(generations)
    .where(eq(generations.sessionId, sessionId))
    .orderBy(desc(generations.sessionOrder));
  if (snaps.length === 0) return [];
  const ids = snaps.map((s) => s.id);
  const imageRows = await db
    .select()
    .from(generationImages)
    .where(inArray(generationImages.generationId, ids))
    .orderBy(asc(generationImages.sequenceIndex));
  const byGen = new Map<string, GenerationImage[]>();
  for (const img of imageRows) {
    const list = byGen.get(img.generationId);
    if (list) list.push(img);
    else byGen.set(img.generationId, [img]);
  }
  return snaps.map((s) => ({ ...s, images: byGen.get(s.id) ?? [] }));
}

/** Session list for the recent panel / sidebar rail. Each row carries the
 *  latest snapshot + that snapshot's first image so the card can render
 *  without a second roundtrip. */
export async function listUserSessions(
  userId: number,
  q: GenerationHistoryQuery,
) {
  const db = getDb();
  const limit = q.limit ?? 30;
  const conds = [eq(generationSessions.userId, userId)];
  if (q.cursor) {
    const cursorMs = Number(q.cursor);
    if (Number.isFinite(cursorMs)) {
      conds.push(lt(generationSessions.updatedAt, new Date(cursorMs)));
    }
  }
  const sessionRows = await db
    .select()
    .from(generationSessions)
    .where(and(...conds))
    .orderBy(desc(generationSessions.updatedAt))
    .limit(limit + 1);
  const hasMore = sessionRows.length > limit;
  const items = hasMore ? sessionRows.slice(0, limit) : sessionRows;
  const nextCursor = hasMore
    ? String(items[items.length - 1].updatedAt.getTime())
    : null;

  if (items.length === 0) return { items: [], nextCursor };

  // Pull the latest snapshot per session in one query: filter by session
  // ids, sort by sessionOrder DESC, take the first one we see for each id.
  const sessionIds = items.map((s) => s.id);
  let modelFilteredSessionIds = sessionIds;
  if (q.model) {
    const filteredRows = await db
      .select({ sessionId: generations.sessionId })
      .from(generations)
      .where(
        and(
          inArray(generations.sessionId, sessionIds),
          eq(generations.model, q.model),
        ),
      )
      .groupBy(generations.sessionId);
    modelFilteredSessionIds = filteredRows.map((r) => r.sessionId);
  }
  const snapshotRows = await db
    .select()
    .from(generations)
    .where(inArray(generations.sessionId, modelFilteredSessionIds))
    .orderBy(desc(generations.sessionOrder));
  const latestBySession = new Map<string, Generation>();
  for (const s of snapshotRows) {
    if (!latestBySession.has(s.sessionId)) latestBySession.set(s.sessionId, s);
  }

  const snapshotIds = Array.from(latestBySession.values()).map((s) => s.id);
  const imageRows =
    snapshotIds.length > 0
      ? await db
          .select()
          .from(generationImages)
          .where(inArray(generationImages.generationId, snapshotIds))
          .orderBy(asc(generationImages.sequenceIndex))
      : [];
  const firstImageByGen = new Map<string, GenerationImage>();
  for (const img of imageRows) {
    if (!firstImageByGen.has(img.generationId))
      firstImageByGen.set(img.generationId, img);
  }

  const filtered = q.model
    ? items.filter((s) => latestBySession.has(s.id))
    : items;
  return {
    items: filtered.map((s) => {
      const latest = latestBySession.get(s.id) ?? null;
      const firstImage = latest ? firstImageByGen.get(latest.id) ?? null : null;
      return { session: s, latestSnapshot: latest, latestImage: firstImage };
    }),
    nextCursor,
  };
}

// Poll one snapshot's status from upstream. Same flow as before but it
// passes the snapshot's sessionId to finalizeRowSuccess so the parent
// session's image count is bumped when terminal.
export async function pollSnapshotStatus(
  userId: number,
  apiKey: string,
  id: string,
) {
  const db = getDb();
  const current = await getSnapshotRow(userId, id);
  if (isTerminalTaskStatus(current.status))
    return getSnapshotWithImages(userId, id);
  if (!current.taskId) return getSnapshotWithImages(userId, id);

  const res = await getV1VideoGenerationsTaskId(current.taskId, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const payload = unwrapTaskData<UpstreamFetchResp>(res.data);
  const status = normalizeTaskStatus(payload?.status);
  const progress = payload?.progress ?? current.progress ?? "0%";

  if (status === "failure") {
    await finalizeRowFailure(db, id, payload?.fail_reason ?? "", { progress });
    return getSnapshotWithImages(userId, id);
  }

  if (status !== "success") {
    await db
      .update(generations)
      .set({ status, progress, updatedAt: dayjs().toDate() })
      .where(eq(generations.id, id));
    return getSnapshotWithImages(userId, id);
  }

  const upstreamUrls: string[] =
    payload?.result_urls && payload.result_urls.length > 0
      ? payload.result_urls.filter(
          (u): u is string => typeof u === "string" && u.length > 0,
        )
      : payload?.result_url
        ? [payload.result_url]
        : [];

  if (upstreamUrls.length === 0) {
    await finalizeRowFailure(db, id, "upstream success without result url(s)", {
      progress,
    });
    return getSnapshotWithImages(userId, id);
  }

  const collected: ImagePayload[] = [];
  for (const u of upstreamUrls) {
    const uploaded = await downloadAndUploadGeneration(u, id, apiKey);
    collected.push({ resultUri: u, uploaded });
  }
  await finalizeRowSuccess(db, id, current.sessionId, collected);
  return getSnapshotWithImages(userId, id);
}

export async function setVisibility(
  userId: number,
  id: string,
  visibility: GenerationVisibility,
) {
  const db = getDb();
  if (visibility === "public") {
    const existing = await getSnapshotRow(userId, id);
    if (existing.nsfw) {
      throw new Error(msg("ERRORS.NSFW_NOT_PUBLISHABLE"));
    }
  }
  const result = await db
    .update(generations)
    .set({ visibility, updatedAt: dayjs().toDate() })
    .where(and(eq(generations.id, id), eq(generations.userId, userId)))
    .returning({ id: generations.id });
  assertFound(result);
  return getSnapshotWithImages(userId, id);
}

// ---------------------------------------------------------------------------
// Deletes: snapshot vs whole session
// ---------------------------------------------------------------------------

/** Delete one snapshot. R2 objects are unlinked first, then the row drops.
 *  If the deletion empties the parent session, cascade-delete the session
 *  too so we don't leak empty rows. */
export async function deleteSnapshot(userId: number, id: string) {
  const db = getDb();
  const snapshot = await getSnapshotRow(userId, id);
  const images = await listGenerationImages(id);
  for (const img of images) {
    try {
      await deleteGenerationObject(img.r2Key);
    } catch (err) {
      logger.warn("r2 delete failed", {
        context: "generation.snapshot.delete",
        generationId: id,
        r2Key: img.r2Key,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }
  await db
    .delete(generations)
    .where(and(eq(generations.id, id), eq(generations.userId, userId)));

  // Decrement parent counts. If the session is now empty, drop it; else
  // refresh updatedAt so the list re-sorts away from the dead snapshot.
  const remaining = await db
    .select({ count: sql<number>`count(*)` })
    .from(generations)
    .where(eq(generations.sessionId, snapshot.sessionId));
  const remainingCount = Number(remaining[0]?.count ?? 0);
  if (remainingCount === 0) {
    await db
      .delete(generationSessions)
      .where(eq(generationSessions.id, snapshot.sessionId));
  } else {
    await db
      .update(generationSessions)
      .set({
        snapshotCount: sql`${generationSessions.snapshotCount} - 1`,
        imageCount: sql`${generationSessions.imageCount} - ${images.length}`,
        updatedAt: dayjs().toDate(),
      })
      .where(eq(generationSessions.id, snapshot.sessionId));
  }
  return { id, sessionId: snapshot.sessionId, sessionDeleted: remainingCount === 0 };
}

/** Delete an entire session: every snapshot's R2 objects, then the session
 *  row (snapshots + images cascade via FK). */
export async function deleteSession(userId: number, sessionId: string) {
  const db = getDb();
  await getSessionRow(userId, sessionId);
  const snapshots = await db
    .select({ id: generations.id })
    .from(generations)
    .where(eq(generations.sessionId, sessionId));
  if (snapshots.length > 0) {
    const imgs = await db
      .select()
      .from(generationImages)
      .where(
        inArray(
          generationImages.generationId,
          snapshots.map((s) => s.id),
        ),
      );
    for (const img of imgs) {
      try {
        await deleteGenerationObject(img.r2Key);
      } catch (err) {
        logger.warn("r2 delete failed", {
          context: "generation.session.delete",
          sessionId,
          r2Key: img.r2Key,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
  await db
    .delete(generationSessions)
    .where(eq(generationSessions.id, sessionId));
  return { id: sessionId };
}

/** Sweeper-friendly delete: skip ownership check. */
export async function deleteSessionAsSystem(sessionId: string) {
  const db = getDb();
  const snapshots = await db
    .select({ id: generations.id })
    .from(generations)
    .where(eq(generations.sessionId, sessionId));
  if (snapshots.length > 0) {
    const imgs = await db
      .select()
      .from(generationImages)
      .where(
        inArray(
          generationImages.generationId,
          snapshots.map((s) => s.id),
        ),
      );
    for (const img of imgs) {
      try {
        await deleteGenerationObject(img.r2Key);
      } catch (err) {
        logger.warn("r2 delete failed (sweeper)", {
          context: "generation.sweep.session",
          sessionId,
          r2Key: img.r2Key,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
  await db
    .delete(generationSessions)
    .where(eq(generationSessions.id, sessionId));
}

export async function listExpiredSessionIds(
  limit: number = 100,
): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({ id: generationSessions.id })
    .from(generationSessions)
    .where(lt(generationSessions.expiresAt, new Date()))
    .limit(limit);
  return rows.map((r) => r.id);
}

// ---------------------------------------------------------------------------
// Sharing (session-level)
// ---------------------------------------------------------------------------

export async function createShareLink(userId: number, sessionId: string) {
  const db = getDb();
  const existing = await getSessionRow(userId, sessionId);
  if (existing.shareId) return { shareId: existing.shareId };
  const shareId = uid(12);
  const result = await db
    .update(generationSessions)
    .set({ shareId, updatedAt: dayjs().toDate() })
    .where(
      and(
        eq(generationSessions.id, sessionId),
        eq(generationSessions.userId, userId),
      ),
    )
    .returning({ id: generationSessions.id });
  assertFound(result);
  return { shareId };
}

export async function revokeShareLink(userId: number, sessionId: string) {
  const db = getDb();
  const result = await db
    .update(generationSessions)
    .set({ shareId: null, updatedAt: dayjs().toDate() })
    .where(
      and(
        eq(generationSessions.id, sessionId),
        eq(generationSessions.userId, userId),
      ),
    )
    .returning({ id: generationSessions.id });
  assertFound(result);
  return { id: sessionId };
}

/** Public read: anyone with the shareId sees the whole session history. */
export async function getSharedSession(shareId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(generationSessions)
    .where(eq(generationSessions.shareId, shareId))
    .limit(1);
  assertFound(rows);
  const session = rows[0];
  const snapshots = await listSnapshotsWithImages(session.id);
  const safeSnapshots = snapshots.map((s) => {
    const { submittedKey: _sk, ...safe } = s;
    return safe;
  });
  return { session, snapshots: safeSnapshots };
}

// ---------------------------------------------------------------------------
// Export / Import / Clone
// ---------------------------------------------------------------------------

export type GenerationSnapshot = {
  version: "unorouter-generation-1";
  model: string;
  prompt: string;
  negativePrompt: string | null;
  params: unknown;
  loras: unknown;
  references: unknown;
  extraParams: unknown;
  nsfw: boolean;
  images: Array<{
    sequenceIndex: number;
    r2Url: string;
    mimeType: string | null;
    width: number | null;
    height: number | null;
  }>;
};

export type SessionSnapshot = {
  version: "unorouter-session-1";
  session: { title: string | null; firstModel: string | null };
  snapshots: GenerationSnapshot[];
};

export type CloneMode = "restore" | "regenerate";

function rowToSnapshot(
  row: Generation,
  images: GenerationImage[],
): GenerationSnapshot {
  return {
    version: "unorouter-generation-1",
    model: row.model,
    prompt: row.prompt,
    negativePrompt: row.negativePrompt,
    params: row.params,
    loras: row.loras,
    references: row.references,
    extraParams: row.extraParams,
    nsfw: row.nsfw,
    images: images.map((img) => ({
      sequenceIndex: img.sequenceIndex,
      r2Url: img.r2Url,
      mimeType: img.mimeType,
      width: img.width,
      height: img.height,
    })),
  };
}

/** Export a whole session. */
export async function exportSession(
  userId: number,
  sessionId: string,
): Promise<SessionSnapshot> {
  const session = await getSessionRow(userId, sessionId);
  const snapshots = await listSnapshotsWithImages(sessionId);
  return {
    version: "unorouter-session-1",
    session: { title: session.title, firstModel: session.firstModel },
    snapshots: snapshots.map((s) => rowToSnapshot(s, s.images)),
  };
}

export async function exportSharedSession(
  shareId: string,
): Promise<SessionSnapshot> {
  const db = getDb();
  const rows = await db
    .select()
    .from(generationSessions)
    .where(eq(generationSessions.shareId, shareId))
    .limit(1);
  assertFound(rows);
  const snapshots = await listSnapshotsWithImages(rows[0].id);
  return {
    version: "unorouter-session-1",
    session: { title: rows[0].title, firstModel: rows[0].firstModel },
    snapshots: snapshots.map((s) => rowToSnapshot(s, s.images)),
  };
}

/** Clone a single-snapshot payload into a new single-snapshot session. */
async function cloneSnapshotIntoNewSession(args: {
  userId: number;
  apiKey: string;
  snapshot: GenerationSnapshot;
  mode: CloneMode;
}): Promise<{ sessionId: string }> {
  const { userId, apiKey, snapshot, mode } = args;
  const db = getDb();
  const now = Date.now();
  const expiresAt = new Date(now + RETENTION_MS);

  if (mode === "regenerate") {
    const body: GenerationSubmitBody = {
      model: snapshot.model,
      prompt: snapshot.prompt,
      negativePrompt: snapshot.negativePrompt ?? undefined,
      params: snapshot.params as GenerationSubmitBody["params"],
      loras: snapshot.loras as GenerationSubmitBody["loras"],
      references: snapshot.references as GenerationSubmitBody["references"],
      extraParams: snapshot.extraParams as Record<string, unknown> | undefined,
      visibility: "private",
      nsfw: snapshot.nsfw,
    };
    const { session } = await submitGeneration(userId, apiKey, body);
    return { sessionId: session.id };
  }

  // restore: build the session + a single success snapshot inline.
  const sessionId = uid();
  const snapshotId = uid();
  const title = snapshot.prompt.slice(0, 60).trim() || null;
  await db.insert(generationSessions).values({
    id: sessionId,
    userId,
    title,
    firstModel: snapshot.model,
    snapshotCount: 1,
    imageCount: 0,
    expiresAt,
  });
  await db.insert(generations).values({
    id: snapshotId,
    userId,
    sessionId,
    sessionOrder: 0,
    requestedCount: Math.max(1, snapshot.images.length),
    model: snapshot.model,
    prompt: snapshot.prompt,
    negativePrompt: snapshot.negativePrompt,
    params: snapshot.params as never,
    loras: snapshot.loras as never,
    references: snapshot.references as never,
    extraParams: snapshot.extraParams as never,
    status: "pending",
    visibility: "private",
    nsfw: snapshot.nsfw,
    costQuota: 0,
    expiresAt,
    submittedKey: apiKey,
  });

  try {
    const collected: ImagePayload[] = [];
    for (const img of snapshot.images) {
      const uploaded = await downloadAndUploadGeneration(img.r2Url, snapshotId, apiKey);
      collected.push({ resultUri: img.r2Url, uploaded });
    }
    if (collected.length === 0) {
      await finalizeRowFailure(db, snapshotId, "snapshot contained no images");
      return { sessionId };
    }
    await finalizeRowSuccess(db, snapshotId, sessionId, collected);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("clone restore failed", {
      context: "generation.clone",
      generationId: snapshotId,
      err: message,
    });
    await finalizeRowFailure(db, snapshotId, message);
    throw err;
  }
  return { sessionId };
}

/** Clone a whole session: restore re-hosts every snapshot's images;
 *  regenerate fires N upstream submits inside one new session. */
async function cloneSessionPayload(args: {
  userId: number;
  apiKey: string;
  payload: SessionSnapshot;
  mode: CloneMode;
}): Promise<{ sessionId: string }> {
  const { userId, apiKey, payload, mode } = args;
  const db = getDb();
  const now = Date.now();
  const expiresAt = new Date(now + RETENTION_MS);

  // Create the empty session up-front; we then iterate snapshots in order.
  const sessionId = uid();
  const title = payload.session.title?.slice(0, 60).trim() || null;
  await db.insert(generationSessions).values({
    id: sessionId,
    userId,
    title,
    firstModel: payload.session.firstModel,
    snapshotCount: 0,
    imageCount: 0,
    expiresAt,
  });

  if (mode === "regenerate") {
    for (const snap of payload.snapshots) {
      const body: GenerationSubmitBody & { sessionId: string } = {
        sessionId,
        model: snap.model,
        prompt: snap.prompt,
        negativePrompt: snap.negativePrompt ?? undefined,
        params: snap.params as GenerationSubmitBody["params"],
        loras: snap.loras as GenerationSubmitBody["loras"],
        references: snap.references as GenerationSubmitBody["references"],
        extraParams: snap.extraParams as Record<string, unknown> | undefined,
        visibility: "private",
        nsfw: snap.nsfw,
      };
      try {
        await submitGeneration(userId, apiKey, body);
      } catch (err) {
        logger.warn("session clone regenerate skipped snapshot", {
          context: "generation.clone.session.regenerate",
          sessionId,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    }
    return { sessionId };
  }

  // restore: insert each snapshot in success state, re-hosting images.
  for (let i = 0; i < payload.snapshots.length; i++) {
    const snap = payload.snapshots[i];
    const snapshotId = uid();
    await db.insert(generations).values({
      id: snapshotId,
      userId,
      sessionId,
      sessionOrder: i,
      requestedCount: Math.max(1, snap.images.length),
      model: snap.model,
      prompt: snap.prompt,
      negativePrompt: snap.negativePrompt,
      params: snap.params as never,
      loras: snap.loras as never,
      references: snap.references as never,
      extraParams: snap.extraParams as never,
      status: "pending",
      visibility: "private",
      nsfw: snap.nsfw,
      costQuota: 0,
      expiresAt,
      submittedKey: apiKey,
    });
    await db
      .update(generationSessions)
      .set({
        snapshotCount: sql`${generationSessions.snapshotCount} + 1`,
        updatedAt: dayjs().toDate(),
      })
      .where(eq(generationSessions.id, sessionId));
    try {
      const collected: ImagePayload[] = [];
      for (const img of snap.images) {
        const uploaded = await downloadAndUploadGeneration(
          img.r2Url,
          snapshotId,
          apiKey,
        );
        collected.push({ resultUri: img.r2Url, uploaded });
      }
      if (collected.length === 0) {
        await finalizeRowFailure(db, snapshotId, "snapshot contained no images");
      } else {
        await finalizeRowSuccess(db, snapshotId, sessionId, collected);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("session clone restore failed snapshot", {
        context: "generation.clone.session.restore",
        sessionId,
        snapshotId,
        err: message,
      });
      await finalizeRowFailure(db, snapshotId, message);
    }
  }
  return { sessionId };
}

/** Dispatch on payload shape. Single-snapshot imports land as a new
 *  session with one snapshot; full-session imports preserve the trail. */
export async function cloneFromPayload(args: {
  userId: number;
  apiKey: string;
  payload: GenerationSnapshot | SessionSnapshot;
  mode: CloneMode;
}): Promise<{ sessionId: string }> {
  if (args.payload.version === "unorouter-session-1") {
    return cloneSessionPayload({
      userId: args.userId,
      apiKey: args.apiKey,
      payload: args.payload,
      mode: args.mode,
    });
  }
  return cloneSnapshotIntoNewSession({
    userId: args.userId,
    apiKey: args.apiKey,
    snapshot: args.payload,
    mode: args.mode,
  });
}
