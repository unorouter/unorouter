"use client";

import { msg } from "@/lib/config/constants";
import { rec } from "@/lib/utils/base";
import {
  providerError,
  providerFetch,
  type ProviderCtx,
} from "@/components/pages/sidebar/chat/runtime/transport/provider-fetch";

// "videos" is the OpenAI style /videos job API, "generations" the new-api task
// API /video/generations; relays speak one or the other.
export type CustomVideoApi = "videos" | "generations";

export type CustomVideoStatus =
  "SUBMITTED" | "QUEUED" | "IN_PROGRESS" | "SUCCESS" | "FAILURE";

export type CustomVideoPoll = {
  status: CustomVideoStatus;
  progress: string;
  failReason?: string;
  resultUrl?: string;
};

const STATUS: Record<string, CustomVideoStatus> = {
  queued: "QUEUED",
  pending: "QUEUED",
  submitted: "SUBMITTED",
  not_start: "SUBMITTED",
  in_progress: "IN_PROGRESS",
  processing: "IN_PROGRESS",
  running: "IN_PROGRESS",
  completed: "SUCCESS",
  succeeded: "SUCCESS",
  success: "SUCCESS",
  done: "SUCCESS",
  failed: "FAILURE",
  failure: "FAILURE",
  error: "FAILURE",
  cancelled: "FAILURE",
  expired: "FAILURE",
};

const jobPath = (api: CustomVideoApi, id: string) =>
  `${api === "videos" ? "/videos" : "/video/generations"}/${encodeURIComponent(id)}`;

// new-api wraps task replies as {code, data}; the OpenAI style answers bare.
function unwrap(body: unknown): Record<string, unknown> {
  const root = rec(body) ?? {};
  const data = rec(root.data);
  return data && !Array.isArray(root.data) ? data : root;
}

function jobId(body: Record<string, unknown>): string | null {
  for (const v of [body.id, body.task_id, body.request_id])
    if (typeof v === "string" && v) return v;
  return null;
}

export async function submitCustomVideo(
  ctx: ProviderCtx,
  model: string,
  prompt: string,
  imageUrl: string | undefined,
  signal?: AbortSignal,
): Promise<{ taskId: string; api: CustomVideoApi; status: CustomVideoStatus }> {
  const image = imageUrl ? { image: imageUrl, input_reference: imageUrl } : {};
  let api: CustomVideoApi = "videos";
  let res = await providerFetch(ctx, "/videos", {
    json: { model, prompt, ...image },
    signal,
  });
  if (res.status === 404 || res.status === 405) {
    api = "generations";
    res = await providerFetch(ctx, "/video/generations", {
      json: {
        model,
        prompt,
        ...image,
        ...(imageUrl && { images: [imageUrl] }),
      },
      signal,
    });
  }
  if (!res.ok) throw await providerError(res);
  const body = unwrap(await res.json());
  const taskId = jobId(body);
  if (!taskId) throw new Error(msg("ERRORS.CUSTOM_VIDEO_NO_JOB"));
  return {
    taskId,
    api,
    status: STATUS[String(body.status ?? "").toLowerCase()] ?? "SUBMITTED",
  };
}

function resultUrl(body: Record<string, unknown>): string | undefined {
  const video = rec(body.video);
  const candidates = [
    body.video_url,
    body.url,
    body.result_url,
    video?.url,
    ...(Array.isArray(body.urls) ? [body.urls[0]] : []),
    ...(Array.isArray(body.result_urls) ? [body.result_urls[0]] : []),
  ];
  return candidates.find((v): v is string => typeof v === "string" && !!v);
}

export async function pollCustomVideo(
  ctx: ProviderCtx,
  api: CustomVideoApi,
  taskId: string,
  signal?: AbortSignal,
): Promise<CustomVideoPoll> {
  const res = await providerFetch(ctx, jobPath(api, taskId), { signal });
  if (!res.ok) throw await providerError(res);
  const body = unwrap(await res.json());
  const raw = String(body.status ?? "").toLowerCase();
  const status = STATUS[raw] ?? "IN_PROGRESS";
  const pct = Number(String(body.progress ?? "").replace("%", ""));
  const error = rec(body.error);
  const failReason =
    (typeof body.fail_reason === "string" && body.fail_reason) ||
    (typeof error?.message === "string" && error.message) ||
    undefined;
  const progress = Number.isFinite(pct) && pct > 0 ? `${Math.round(pct)}%` : "";
  if (status !== "SUCCESS")
    return { status, progress, ...(failReason && { failReason }) };
  // The OpenAI style job serves its file from /content when no URL is listed.
  const url =
    resultUrl(body) ??
    (api === "videos" ? `${ctx.base}${jobPath(api, taskId)}/content` : null);
  return url
    ? { status, progress, resultUrl: url }
    : {
        status: "FAILURE",
        progress,
        failReason: msg("ERRORS.CUSTOM_VIDEO_NO_FILE"),
      };
}
