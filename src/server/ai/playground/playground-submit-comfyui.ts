import { postV1VideoGenerations } from "@/openapi";
import {
  normalizeTaskStatus,
  unwrapTaskData,
  type UpstreamSubmitResp,
} from "@/lib/api/video-task";
import { msg } from "@/lib/config/constants";
import { getDb } from "@/lib/db/server/client";
import { upscalerCatalog } from "@/lib/db/schema";
import type { PlaygroundSubmitBody } from "@/lib/validation/playground";
import { eq } from "drizzle-orm";
import { paramsToSize } from "./playground-finalize";

export async function submitComfyUITask(args: {
  apiKey: string;
  body: PlaygroundSubmitBody;
  n: number;
}): Promise<{ taskId: string; status: string }> {
  const { apiKey, body, n } = args;
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
    if (params.hiresUpscale !== undefined)
      hires.upscale_by = params.hiresUpscale;
    extra.hires = hires;
  }
  extra.n = n;
  if (body.loras && body.loras.length > 0) extra.loras = body.loras;
  if (body.references && body.references.length > 0)
    extra.references = body.references;

  if (params.initImageUrl) extra.init_image_url = params.initImageUrl;
  if (params.maskUrl) extra.mask_url = params.maskUrl;

  if (params.upscaler) {
    extra.upscaler = params.upscaler;
    const rows = await getDb()
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

  if (params.embeddings && params.embeddings.length > 0)
    extra.embeddings = params.embeddings;

  if (params.layerDiffusion) extra.layer_diffusion = params.layerDiffusion;

  if (params.adetailer) extra.adetailer = params.adetailer;

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
  return { taskId, status: normalizeTaskStatus(payload?.status) };
}
