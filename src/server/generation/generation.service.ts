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
  generations,
  type GenerationImage,
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
import { and, asc, desc, eq, inArray, lt } from "drizzle-orm";

// Retention window: rows older than this are removed by the background
// sweeper (DB cascade-deletes generation_images, then we delete the R2
// objects). The 30-day cap matches what the UI promises in the about/
// retention copy. Bump here when changing the policy.
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

// Cap on per-submission images. Must stay aligned with the form's
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
// transaction so consumers don't see a half-populated row. ----------

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

/** Per-call image count (1..MAX_IMAGES_PER_GEN). Reads `params.n` and
 *  clamps. The validator already constrains the input range, but defending
 *  here keeps the helpers honest if the validator is ever loosened. */
function imageCountFor(body: GenerationSubmitBody): number {
  const n = body.params?.n ?? 1;
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(MAX_IMAGES_PER_GEN, Math.floor(n));
}

async function finalizeRowSuccess(
  db: ReturnType<typeof getDb>,
  id: string,
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
        // Don't persist data: URIs - they're just inline payloads, not
        // addressable resources. Keep the column as the public URL when
        // one exists.
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

export async function submitGeneration(
  userId: number,
  apiKey: string,
  body: GenerationSubmitBody,
) {
  const db = getDb();
  const id = uid();
  const visibility = body.visibility ?? "private";
  const nsfw = body.nsfw ?? true;
  const requestedCount = imageCountFor(body);
  // Bill per image. The pre-charge mirrors what the UI quotes on the
  // Generate button (pricePerCall * variants); final cost is settled
  // from upstream logs at finalize time. Zero for ratio-based models.
  const costQuota =
    dollarsToQuota(await getModelFixedPrice(body.model)) * requestedCount;
  const now = Date.now();

  // Insert pending row first so the UI's history rail can show the tile
  // immediately and so a crash mid-submit doesn't lose the request.
  await db.insert(generations).values({
    id,
    userId,
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
    expiresAt: new Date(now + RETENTION_MS),
    // Persisted so the server-side sweeper can poll upstream as the same
    // user when the client tab is closed. Cleared on terminal status.
    submittedKey: apiKey,
  });

  const resolved = await resolveSubmissionEndpoint(body.model);

  try {
    if (resolved.kind === "comfyui-task") {
      await submitComfyUITask({ db, id, apiKey, body, n: requestedCount });
    } else {
      await submitSyncImage({
        db,
        id,
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
      model: body.model,
      err: message,
    });
    await finalizeRowFailure(db, id, message);
    throw err;
  }

  return getGenerationWithImages(userId, id);
}

// ComfyUI task adapter (channel type 59). Async submit; status is reached
// via pollGenerationStatus. The workflow's batch_size input is patched
// from `extra.n` server-side, so a single upstream task returns N images.
// The submitted row is left in flight with `submittedKey = apiKey` so the
// server-side sweeper can poll it.
async function submitComfyUITask(args: {
  db: ReturnType<typeof getDb>;
  id: string;
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
  // Always forward `n` so the workflow's batch_size patch fires; the
  // adapter caps at its own batchSizeMax internally.
  extra.n = n;
  if (body.loras && body.loras.length > 0) extra.loras = body.loras;
  if (body.references && body.references.length > 0)
    extra.references = body.references;

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

// Sync image submission. Hits one of three upstream paths based on the
// model's declared supported_endpoint_types. Reference URLs are fetched
// once and re-encoded per endpoint shape. Result lands inline; we extract
// the URL(s)/data URI(s), hand them to downloadAndUploadGeneration, and
// finalize the row in a single transaction. No polling.
//
// Batch handling: image-generation supports `n` natively, so one call
// returns N images. chat / gemini don't, so we loop server-side. Either
// way the row ends up with N generation_images rows on success.
async function submitSyncImage(args: {
  db: ReturnType<typeof getDb>;
  id: string;
  apiKey: string;
  body: GenerationSubmitBody;
  endpoint: SyncImageEndpoint;
  n: number;
}) {
  const { db, id, apiKey, body, endpoint, n } = args;
  const params = body.params ?? {};
  const size = paramsToSize(body.params);

  // Cap refs to the model's declared maxImageInputs as a server-side
  // belt-and-braces guard. If the catalog says max=6 and the form sent 8,
  // drop the tail rather than fail upstream.
  const meta = await getModelMetadata(body.model);
  const cap = meta.maxImageInputs ?? 6;
  const refUrls = (body.references ?? []).slice(0, cap).map((r) => r.url);
  const refs = refUrls.length > 0 ? await fetchAllRefs(refUrls) : [];

  const supportsNativeBatch = endpoint === "image-generation";
  // For chat/gemini we loop one call at a time. For image-generation we
  // hit upstream once with n=N. Reference fetch happens once either way.
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
      // multipart - let fetch set the boundary
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
      // Live progress hint while we loop chat/gemini. The UI shows
      // "Generating M of N..." until the row hits terminal.
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

  await finalizeRowSuccess(db, id, collected);
}

// Bare-row lookup. Used internally where we don't need the images (the
// poll path that's about to write images anyway). External callers should
// use getGenerationWithImages so the wire shape stays consistent.
export async function getGeneration(userId: number, id: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(generations)
    .where(and(eq(generations.id, id), eq(generations.userId, userId)))
    .limit(1);
  assertFound(rows);
  return rows[0];
}

export async function getGenerationWithImages(userId: number, id: string) {
  const row = await getGeneration(userId, id);
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

// Poll one generation's status from upstream, write it back to the row,
// and inline-finalize on terminal success (download + R2 + cost settle).
// On batch results (ComfyUI batch_size > 1) the upstream returns
// `result_urls: string[]` instead of the single `result_url` field;
// both shapes are normalized here.
export async function pollGenerationStatus(
  userId: number,
  apiKey: string,
  id: string,
) {
  const db = getDb();
  const current = await getGeneration(userId, id);
  if (isTerminalTaskStatus(current.status)) return getGenerationWithImages(userId, id);
  if (!current.taskId) return getGenerationWithImages(userId, id);

  const res = await getV1VideoGenerationsTaskId(current.taskId, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const payload = unwrapTaskData<UpstreamFetchResp>(res.data);
  const status = normalizeTaskStatus(payload?.status);
  const progress = payload?.progress ?? current.progress ?? "0%";

  if (status === "failure") {
    await finalizeRowFailure(db, id, payload?.fail_reason ?? "", { progress });
    return getGenerationWithImages(userId, id);
  }

  if (status !== "success") {
    await db
      .update(generations)
      .set({ status, progress, updatedAt: dayjs().toDate() })
      .where(eq(generations.id, id));
    return getGenerationWithImages(userId, id);
  }

  // SUCCESS: normalize the payload into a list of upstream URIs. ComfyUI
  // batch_size>1 returns result_urls[]; single-image responses still use
  // result_url. We support both.
  const upstreamUrls: string[] =
    payload?.result_urls && payload.result_urls.length > 0
      ? payload.result_urls.filter((u): u is string => typeof u === "string" && u.length > 0)
      : payload?.result_url
        ? [payload.result_url]
        : [];

  if (upstreamUrls.length === 0) {
    await finalizeRowFailure(db, id, "upstream success without result url(s)", {
      progress,
    });
    return getGenerationWithImages(userId, id);
  }

  // The upstream proxies its own /v1/videos/<task_id>/content URL when the
  // worker returns base64 inline. That endpoint requires the user's bearer
  // token; for HTTPS-CDN URLs (S3) the token is ignored upstream.
  const collected: ImagePayload[] = [];
  for (const u of upstreamUrls) {
    const uploaded = await downloadAndUploadGeneration(u, id, apiKey);
    collected.push({ resultUri: u, uploaded });
  }
  await finalizeRowSuccess(db, id, collected);
  return getGenerationWithImages(userId, id);
}

export async function listUserGenerations(
  userId: number,
  q: GenerationHistoryQuery,
) {
  const db = getDb();
  const limit = q.limit ?? 30;
  const conds = [eq(generations.userId, userId)];
  if (q.model) conds.push(eq(generations.model, q.model));
  if (q.cursor) {
    const cursorMs = Number(q.cursor);
    if (Number.isFinite(cursorMs)) {
      conds.push(lt(generations.createdAt, new Date(cursorMs)));
    }
  }
  const rows = await db
    .select()
    .from(generations)
    .where(and(...conds))
    .orderBy(desc(generations.createdAt))
    .limit(limit + 1);
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore
    ? String(items[items.length - 1].createdAt.getTime())
    : null;

  // Bulk-load images for the page in one query and bucket them by
  // generationId so the response carries the same shape getGeneration does.
  const ids = items.map((it) => it.id);
  const imageRows =
    ids.length > 0
      ? await db
          .select()
          .from(generationImages)
          .where(inArray(generationImages.generationId, ids))
          .orderBy(asc(generationImages.sequenceIndex))
      : [];
  const byGen = new Map<string, GenerationImage[]>();
  for (const img of imageRows) {
    const list = byGen.get(img.generationId);
    if (list) list.push(img);
    else byGen.set(img.generationId, [img]);
  }
  return {
    items: items.map((it) => ({ ...it, images: byGen.get(it.id) ?? [] })),
    nextCursor,
  };
}

export async function setVisibility(
  userId: number,
  id: string,
  visibility: GenerationVisibility,
) {
  const db = getDb();
  // NSFW gens are owner-only by policy: they can never be set to public
  // (no listing in the gallery, no open access via URL). Owners can
  // still flip between private and unlisted if they want to share a
  // direct link with another logged-in user.
  if (visibility === "public") {
    const existing = await getGeneration(userId, id);
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
  return getGenerationWithImages(userId, id);
}

export async function deleteGeneration(userId: number, id: string) {
  const db = getDb();
  // Ownership check; throws assertFound if not the user's row.
  await getGeneration(userId, id);
  const images = await listGenerationImages(id);
  for (const img of images) {
    try {
      await deleteGenerationObject(img.r2Key);
    } catch (err) {
      logger.warn("r2 delete failed", {
        context: "generation.delete",
        generationId: id,
        r2Key: img.r2Key,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }
  // generation_images cascades on this delete.
  const result = await db
    .delete(generations)
    .where(and(eq(generations.id, id), eq(generations.userId, userId)))
    .returning({ id: generations.id });
  assertFound(result);
  return { id };
}

// Sweeper-friendly delete: bypasses the ownership check. Used by the
// retention pass to wipe expired rows regardless of user. Same R2 +
// cascade behavior as deleteGeneration.
export async function deleteGenerationAsSystem(id: string) {
  const db = getDb();
  const images = await listGenerationImages(id);
  for (const img of images) {
    try {
      await deleteGenerationObject(img.r2Key);
    } catch (err) {
      logger.warn("r2 delete failed (sweeper)", {
        context: "generation.sweep.delete",
        generationId: id,
        r2Key: img.r2Key,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }
  await db.delete(generations).where(eq(generations.id, id));
}

// Sweeper helper: returns ids of expired rows. The retention pass scans
// this in batches and calls deleteGenerationAsSystem on each.
export async function listExpiredGenerationIds(
  limit: number = 100,
): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({ id: generations.id })
    .from(generations)
    .where(lt(generations.expiresAt, new Date()))
    .limit(limit);
  return rows.map((r) => r.id);
}

// ---------------------------------------------------------------------------
// Sharing
// ---------------------------------------------------------------------------

/** Mint a public share token. Idempotent: returns the existing shareId
 *  when one is already set so a repeated click on Share doesn't churn
 *  the link the user just copied. */
export async function createShareLink(userId: number, id: string) {
  const db = getDb();
  const existing = await getGeneration(userId, id);
  if (existing.shareId) return { shareId: existing.shareId };
  const shareId = uid(12);
  const result = await db
    .update(generations)
    .set({ shareId, updatedAt: dayjs().toDate() })
    .where(and(eq(generations.id, id), eq(generations.userId, userId)))
    .returning({ id: generations.id });
  assertFound(result);
  return { shareId };
}

export async function revokeShareLink(userId: number, id: string) {
  const db = getDb();
  const result = await db
    .update(generations)
    .set({ shareId: null, updatedAt: dayjs().toDate() })
    .where(and(eq(generations.id, id), eq(generations.userId, userId)))
    .returning({ id: generations.id });
  assertFound(result);
  return { id };
}

/** Public read by shareId. Returns the same shape as getGenerationWithImages
 *  but strips submitter-only fields (submittedKey, etc). No userId check —
 *  anyone with the link can read. */
export async function getSharedGeneration(shareId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(generations)
    .where(eq(generations.shareId, shareId))
    .limit(1);
  assertFound(rows);
  const row = rows[0];
  const images = await listGenerationImages(row.id);
  // Strip server-only fields before returning publicly.
  const { submittedKey: _sk, ...safe } = row;
  return { ...safe, images };
}

// ---------------------------------------------------------------------------
// Export / Import / Clone
// ---------------------------------------------------------------------------
//
// Three operations sharing one payload shape: a portable JSON snapshot of
// the generation row (prompt, params, references, loras, etc.) plus the
// produced images. Used by:
//   - GET /:id/export        → download the snapshot as a file
//   - POST /import           → upload a snapshot to recreate it in my account
//   - POST /from-share/:sid  → clone a shared generation into my account
// All three converge on cloneFromSnapshot.

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
  // The R2 URLs we produced. Import "restore" mode downloads each into
  // the new user's R2 prefix; "regenerate" mode ignores these and fires
  // a fresh upstream submission.
  images: Array<{
    sequenceIndex: number;
    r2Url: string;
    mimeType: string | null;
    width: number | null;
    height: number | null;
  }>;
};

export type CloneMode = "restore" | "regenerate";

function rowToSnapshot(
  row: typeof generations.$inferSelect,
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

/** Build a downloadable snapshot for a generation the user owns. */
export async function exportGeneration(
  userId: number,
  id: string,
): Promise<GenerationSnapshot> {
  const row = await getGeneration(userId, id);
  const images = await listGenerationImages(id);
  return rowToSnapshot(row, images);
}

/** Build a snapshot from a public shareId. Same shape as exportGeneration
 *  but skips the ownership check. */
export async function exportSharedGeneration(
  shareId: string,
): Promise<GenerationSnapshot> {
  const db = getDb();
  const rows = await db
    .select()
    .from(generations)
    .where(eq(generations.shareId, shareId))
    .limit(1);
  assertFound(rows);
  const images = await listGenerationImages(rows[0].id);
  return rowToSnapshot(rows[0], images);
}

/** Clone a snapshot into the target user's account.
 *
 *  - mode="restore": insert a generation row in `success` state and copy
 *    each image into the new user's R2 prefix. No upstream call, no quota
 *    debit (the original generator already paid).
 *  - mode="regenerate": insert a `pending` row and fire a fresh upstream
 *    submission. New images, new quota debit, same prompt+params.
 */
export async function cloneFromSnapshot(args: {
  userId: number;
  apiKey: string;
  snapshot: GenerationSnapshot;
  mode: CloneMode;
}): Promise<{ id: string }> {
  const { userId, apiKey, snapshot, mode } = args;
  const db = getDb();
  const id = uid();
  const now = Date.now();

  if (mode === "regenerate") {
    // Build a submit body from the snapshot and run it through the normal
    // submit path. Cost + N images come from upstream; this row ends up
    // identical-shaped to one the user typed in by hand.
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
    const row = await submitGeneration(userId, apiKey, body);
    return { id: row.id };
  }

  // restore: insert a complete success row + re-host every image to the
  // cloning user's R2 prefix. We don't share R2 keys across users; a
  // delete by the original owner should not break the clone.
  await db.insert(generations).values({
    id,
    userId,
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
    expiresAt: new Date(now + RETENTION_MS),
    submittedKey: apiKey,
  });

  try {
    const collected: ImagePayload[] = [];
    for (const img of snapshot.images) {
      const uploaded = await downloadAndUploadGeneration(img.r2Url, id, apiKey);
      collected.push({ resultUri: img.r2Url, uploaded });
    }
    if (collected.length === 0) {
      // Snapshot had no images (legitimate: a failed-then-shared gen).
      // Mark the row failure so the UI doesn't show an infinite spinner.
      await finalizeRowFailure(db, id, "snapshot contained no images");
      return { id };
    }
    await finalizeRowSuccess(db, id, collected);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("clone restore failed", {
      context: "generation.clone",
      generationId: id,
      err: message,
    });
    await finalizeRowFailure(db, id, message);
    throw err;
  }

  return { id };
}
