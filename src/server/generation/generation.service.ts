import { getV1VideoGenerationsTaskId, postV1VideoGenerations } from "@/openapi";
import { getModelFixedPrice } from "@/lib/api/pricing-cache";
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
import { assertFound } from "@/lib/db/assertions";
import { getDb } from "@/lib/db/client";
import { generations } from "@/lib/db/schema";
import { uid } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import type {
  GenerationHistoryQuery,
  GenerationSubmitBody,
  GenerationVisibility,
} from "@/lib/validation/generation";
import dayjs from "dayjs";
import { and, asc, desc, eq, lt } from "drizzle-orm";

export async function submitGeneration(
  userId: number,
  apiKey: string,
  body: GenerationSubmitBody,
) {
  const db = getDb();
  const id = uid();
  const batchId = body.batchId ?? uid(8);
  const variantIndex = body.variantIndex ?? 0;
  const visibility = body.visibility ?? "private";
  const nsfw = body.nsfw ?? true;
  // Server-side cost estimate from the cached pricing summary. Keeps
  // "this will cost X" honest before we know the upstream-billed quota;
  // final cost is settled from upstream's logs at finalize time. Zero
  // for unknown / ratio-based models.
  const costQuota = dollarsToQuota(await getModelFixedPrice(body.model));

  // Insert pending row first so the UI's history rail can show the tile
  // immediately and so a crash mid-submit doesn't lose the request.
  await db.insert(generations).values({
    id,
    userId,
    batchId,
    variantIndex,
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
    // Persisted so the server-side sweeper can poll upstream as the same
    // user when the client tab is closed. Cleared on terminal status.
    submittedKey: apiKey,
  });

  // Build the upstream submit body. The new-api ComfyUI adapter reads
  //   prompt, size?, metadata.extra.{steps,cfg,seed,denoise,n,loras,references}
  // negative_prompt rides in metadata.negative_prompt for SDXL templates.
  const params = body.params ?? {};
  const size =
    params.width && params.height ? `${params.width}x${params.height}` : undefined;
  const extra: Record<string, unknown> = {};
  if (params.steps !== undefined) extra.steps = params.steps;
  if (params.cfg !== undefined) extra.cfg = params.cfg;
  if (params.guidance !== undefined) extra.cfg = params.guidance;
  if (params.seed !== undefined) extra.seed = params.seed;
  if (params.denoise !== undefined) extra.denoise = params.denoise;
  // The Go adapter expects extra.hires.{denoise,upscale_by} (HiresSpec
  // shape in new-api/relay/channel/task/comfyui/types.go). Send only
  // when at least one knob is set; templates that don't declare the
  // hires_denoise / hires_upscale params silently ignore it.
  if (params.hiresDenoise !== undefined || params.hiresUpscale !== undefined) {
    const hires: Record<string, unknown> = {};
    if (params.hiresDenoise !== undefined) hires.denoise = params.hiresDenoise;
    if (params.hiresUpscale !== undefined) hires.upscale_by = params.hiresUpscale;
    extra.hires = hires;
  }
  if (params.n !== undefined) extra.n = params.n;
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

  let taskId: string | undefined;
  try {
    const res = await postV1VideoGenerations({
      headers: { Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(upstreamBody),
    });
    const payload = unwrapTaskData<UpstreamSubmitResp>(res.data);
    taskId = payload?.task_id ?? payload?.id;
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
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("generation submit failed", {
      context: "generation.submit",
      generationId: id,
      model: body.model,
      err: message,
    });
    await db
      .update(generations)
      .set({
        status: "failure",
        errorMessage: message.slice(0, 500),
        updatedAt: dayjs().toDate(),
      })
      .where(eq(generations.id, id));
    throw err;
  }

  return getGeneration(userId, id);
}

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

// Poll one generation's status from upstream, write it back to the row,
// and inline-finalize on terminal success (download + R2 + cost settle).
export async function pollGenerationStatus(
  userId: number,
  apiKey: string,
  id: string,
) {
  const db = getDb();
  const current = await getGeneration(userId, id);
  if (isTerminalTaskStatus(current.status)) return current;
  if (!current.taskId) return current;

  const res = await getV1VideoGenerationsTaskId(current.taskId, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const payload = unwrapTaskData<UpstreamFetchResp>(res.data);
  const status = normalizeTaskStatus(payload?.status);
  const progress = payload?.progress ?? current.progress ?? "0%";

  if (status === "failure") {
    await db
      .update(generations)
      .set({
        status,
        progress,
        errorMessage: (payload?.fail_reason ?? "").slice(0, 500),
        submittedKey: null,
        updatedAt: dayjs().toDate(),
      })
      .where(eq(generations.id, id));
    return getGeneration(userId, id);
  }

  if (status !== "success") {
    await db
      .update(generations)
      .set({ status, progress, updatedAt: dayjs().toDate() })
      .where(eq(generations.id, id));
    return getGeneration(userId, id);
  }

  // SUCCESS: download the result + upload to R2 + write the final row.
  const upstreamUrl = payload?.result_url;
  if (!upstreamUrl) {
    await db
      .update(generations)
      .set({
        status: "failure",
        progress,
        errorMessage: "upstream success without result_url",
        submittedKey: null,
        updatedAt: dayjs().toDate(),
      })
      .where(eq(generations.id, id));
    return getGeneration(userId, id);
  }

  // The upstream proxies its own /v1/videos/<task_id>/content URL when the
  // worker returns base64 inline. That endpoint requires the user's bearer
  // token; for HTTPS-CDN URLs (S3) the token is ignored upstream.
  const uploaded = await downloadAndUploadGeneration(upstreamUrl, id, apiKey);

  await db
    .update(generations)
    .set({
      status: "success",
      progress: "100%",
      upstreamResultUrl: upstreamUrl,
      r2Url: uploaded.url,
      r2Key: uploaded.key,
      mimeType: uploaded.mime,
      sizeBytes: uploaded.sizeBytes,
      submittedKey: null,
      updatedAt: dayjs().toDate(),
    })
    .where(eq(generations.id, id));

  return getGeneration(userId, id);
}

export async function listUserGenerations(
  userId: number,
  q: GenerationHistoryQuery,
) {
  const db = getDb();
  const limit = q.limit ?? 30;
  const conds = [eq(generations.userId, userId)];
  if (q.batchId) conds.push(eq(generations.batchId, q.batchId));
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
    .orderBy(desc(generations.createdAt), asc(generations.variantIndex))
    .limit(limit + 1);
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore
    ? String(items[items.length - 1].createdAt.getTime())
    : null;
  return { items, nextCursor };
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
  return getGeneration(userId, id);
}

export async function deleteGeneration(userId: number, id: string) {
  const db = getDb();
  const existing = await getGeneration(userId, id);
  if (existing.r2Key) {
    try {
      await deleteGenerationObject(existing.r2Key);
    } catch (err) {
      logger.warn("r2 delete failed", {
        context: "generation.delete",
        generationId: id,
        r2Key: existing.r2Key,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }
  const result = await db
    .delete(generations)
    .where(and(eq(generations.id, id), eq(generations.userId, userId)))
    .returning({ id: generations.id });
  assertFound(result);
  return { id };
}
