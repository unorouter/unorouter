import { getV1VideoGenerationsTaskId, postV1VideoGenerations } from "@/openapi";
import {
  buildBody,
  extractResultUri,
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
import { generations } from "@/lib/db/schema";
import { uid } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import type {
  GenerationHistoryQuery,
  GenerationSubmitBody,
  GenerationVisibility,
} from "@/lib/validation/generation";
import { upstreamApiUrl } from "@/server/constants";
import dayjs from "dayjs";
import { and, asc, desc, eq, lt } from "drizzle-orm";

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

// ---------- Row-finalize helpers (de-duplicate the success / failure blocks
// that previously lived in submitSyncImage, pollGenerationStatus, and the
// submitGeneration catch). All terminal writes share the same trio of
// invariants: clear submittedKey (so the sweeper stops polling), bump
// updatedAt, set the row to a terminal status. ----------

type R2Uploaded = {
  url: string;
  key: string;
  mime: string;
  sizeBytes: number;
};

function paramsToSize(params: GenerationSubmitBody["params"]): string | undefined {
  const p = params ?? {};
  return p.width && p.height ? `${p.width}x${p.height}` : undefined;
}

async function finalizeRowSuccess(
  db: ReturnType<typeof getDb>,
  id: string,
  resultUri: string,
  uploaded: R2Uploaded,
  progress: string = "100%",
) {
  await db
    .update(generations)
    .set({
      status: "success",
      progress,
      // Don't persist a `data:` URI back into the row — it's just the
      // inline payload from the worker. Keep the column as the public
      // upstream URL when one exists.
      upstreamResultUrl: resultUri.startsWith("data:") ? null : resultUri,
      r2Url: uploaded.url,
      r2Key: uploaded.key,
      mimeType: uploaded.mime,
      sizeBytes: uploaded.sizeBytes,
      submittedKey: null,
      updatedAt: dayjs().toDate(),
    })
    .where(eq(generations.id, id));
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

  const resolved = await resolveSubmissionEndpoint(body.model);

  try {
    if (resolved.kind === "comfyui-task") {
      await submitComfyUITask({ db, id, apiKey, body });
    } else {
      await submitSyncImage({
        db,
        id,
        apiKey,
        body,
        endpoint: resolved.endpoint,
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

  return getGeneration(userId, id);
}

// ComfyUI task adapter (channel type 59). Async submit; status is reached
// via pollGenerationStatus. The submitted row is left in flight with
// `submittedKey = apiKey` so the server-side sweeper can poll it.
async function submitComfyUITask(args: {
  db: ReturnType<typeof getDb>;
  id: string;
  apiKey: string;
  body: GenerationSubmitBody;
}) {
  const { db, id, apiKey, body } = args;
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
// the URL/data URI, hand it to downloadAndUploadGeneration, and finalize
// the row in a single update. No polling.
async function submitSyncImage(args: {
  db: ReturnType<typeof getDb>;
  id: string;
  apiKey: string;
  body: GenerationSubmitBody;
  endpoint: SyncImageEndpoint;
}) {
  const { db, id, apiKey, body, endpoint } = args;
  const params = body.params ?? {};
  const size = paramsToSize(body.params);

  // Cap refs to the model's declared maxImageInputs as a server-side
  // belt-and-braces guard. If the catalog says max=6 and the form sent 8,
  // drop the tail rather than fail upstream.
  const meta = await getModelMetadata(body.model);
  const cap = meta.maxImageInputs ?? 6;
  const refUrls = (body.references ?? []).slice(0, cap).map((r) => r.url);
  const refs = refUrls.length > 0 ? await fetchAllRefs(refUrls) : [];

  const built = buildBody(endpoint, {
    model: body.model,
    prompt: body.prompt,
    size,
    refs,
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

  const resultUri = extractResultUri(endpoint, payload);
  if (!resultUri) {
    throw new Error(
      `no image in upstream response (${endpoint}): ${text.slice(0, 200)}`,
    );
  }

  const uploaded = await downloadAndUploadGeneration(resultUri, id, apiKey);
  await finalizeRowSuccess(db, id, resultUri, uploaded);
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
    await finalizeRowFailure(db, id, payload?.fail_reason ?? "", { progress });
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
    await finalizeRowFailure(db, id, "upstream success without result_url", {
      progress,
    });
    return getGeneration(userId, id);
  }

  // The upstream proxies its own /v1/videos/<task_id>/content URL when the
  // worker returns base64 inline. That endpoint requires the user's bearer
  // token; for HTTPS-CDN URLs (S3) the token is ignored upstream.
  const uploaded = await downloadAndUploadGeneration(upstreamUrl, id, apiKey);
  await finalizeRowSuccess(db, id, upstreamUrl, uploaded);
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
