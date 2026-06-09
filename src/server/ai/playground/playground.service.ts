import { getPricingSummary } from "@/lib/api/pricing-cache";
import {
  chooseEndpoint,
  type SyncImageEndpoint,
} from "@/lib/ai/playground/models-dynamic";
import { getV1VideoGenerationsTaskId } from "@/openapi";
import {
  normalizeTaskStatus,
  unwrapTaskData,
  type UpstreamFetchResp,
} from "@/lib/api/video-task";
import { downloadGenerationBytes } from "@/lib/config/r2";
import type { PlaygroundSubmitBody } from "@/lib/validation/playground";
import {
  COMFYUI_TEMPLATE_IDS,
  MAX_IMAGES_PER_GEN,
} from "./playground-constants";
import type { GeneratedImage } from "./playground-finalize";
import { submitComfyUITask } from "./playground-submit-comfyui";
import { submitSyncImage } from "./playground-submit-sync";

function imageCountFor(body: PlaygroundSubmitBody): number {
  const n = body.params?.n ?? 1;
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(MAX_IMAGES_PER_GEN, Math.floor(n));
}

type ResolvedEndpoint =
  | { kind: "comfyui-task" }
  | { kind: "sync"; endpoint: SyncImageEndpoint };

async function resolveSubmissionEndpoint(
  model: string,
): Promise<ResolvedEndpoint> {
  if (COMFYUI_TEMPLATE_IDS.has(model)) return { kind: "comfyui-task" };
  const info = (await getPricingSummary()).models.find((m) => m.name === model);
  if (!info) {
    throw new Error(`model ${model} not in catalog`);
  }
  const endpoint = chooseEndpoint(info.endpointTypes ?? []);
  if (!endpoint) {
    throw new Error(`model ${model} declares no supported endpoint`);
  }
  return { kind: "sync", endpoint };
}

// Client-first; sync-image returns bytes, ComfyUI returns taskId for client polling.
export type SubmitGenerationResult =
  | { kind: "sync"; status: "success"; images: GeneratedImage[] }
  | { kind: "task"; status: string; taskId: string };

export async function submitGeneration(
  apiKey: string,
  body: PlaygroundSubmitBody,
): Promise<SubmitGenerationResult> {
  const requestedCount = imageCountFor(body);
  const resolved = await resolveSubmissionEndpoint(body.model);

  if (resolved.kind === "comfyui-task") {
    const task = await submitComfyUITask({
      apiKey,
      body,
      n: requestedCount,
    });
    return { kind: "task", status: task.status, taskId: task.taskId };
  }

  const images = await submitSyncImage({
    apiKey,
    body,
    endpoint: resolved.endpoint,
    n: requestedCount,
  });
  return { kind: "sync", status: "success", images };
}

// Stateless poll: client passes taskId; server forwards status + downloads bytes on success.
export type PollGenerationResult =
  | { status: "success"; progress: string; images: GeneratedImage[] }
  | { status: "failure"; progress: string; errorMessage: string }
  | { status: string; progress: string };

export async function pollGeneration(
  apiKey: string,
  taskId: string,
): Promise<PollGenerationResult> {
  const res = await getV1VideoGenerationsTaskId(taskId, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const payload = unwrapTaskData<UpstreamFetchResp>(res.data);
  const status = normalizeTaskStatus(payload?.status);
  const progress = payload?.progress ?? "0%";

  if (status === "failure") {
    return {
      status: "failure",
      progress,
      errorMessage: payload?.fail_reason ?? "generation failed",
    };
  }
  if (status !== "success") {
    return { status, progress };
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
    return {
      status: "failure",
      progress,
      errorMessage: "upstream success without result url(s)",
    };
  }

  const images: GeneratedImage[] = [];
  for (const url of upstreamUrls) {
    const bytes = await downloadGenerationBytes(url, apiKey);
    images.push({
      resultUrl: url.startsWith("data:") ? null : url,
      base64: bytes.buffer.toString("base64"),
      mimeType: bytes.mime,
      sizeBytes: bytes.sizeBytes,
    });
  }
  return { status: "success", progress, images };
}
