import type { Built, ExtractedResult } from "@/lib/ai/image/dispatch";
import { downloadGenerationBytes } from "@/lib/config/safe-fetch";
import type { GeneratedImage, ImageSubmitBody } from "@/lib/validation/image";
import { upstreamApiUrl } from "@/server/constants";
import sharp from "sharp";

// The request's width/height are not authoritative: the gateway clamps to 1MP
// and hosted models pick their own size.
export async function probeImageSize(
  buffer: Buffer,
): Promise<{ width: number | null; height: number | null }> {
  try {
    const meta = await sharp(buffer).metadata();
    return { width: meta.width ?? null, height: meta.height ?? null };
  } catch {
    return { width: null, height: null };
  }
}

// JSON bodies pass VERBATIM: the client parses .error.message, and any prefix
// leaves the string neither plain text nor parseable JSON.
function formatUpstreamError(status: number, body: string): string {
  const trimmed = body.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return trimmed;
  return trimmed ? `${status}: ${trimmed.slice(0, 300)}` : `upstream ${status}`;
}

export class UpstreamImageError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(formatUpstreamError(status, body));
  }
}

export type UpstreamSize = { width: number; height: number };

export function sizeOf(
  params: ImageSubmitBody["params"],
): UpstreamSize | undefined {
  const p = params ?? {};
  if (!p.width || !p.height) return undefined;
  const scale = typeof p.hiresUpscale === "number" ? p.hiresUpscale : 1;
  if (scale <= 1) return { width: p.width, height: p.height };
  return {
    width: Math.round(p.width * scale),
    height: Math.round(p.height * scale),
  };
}

export function formatSize(size: UpstreamSize | undefined): string | undefined {
  return size ? `${size.width}x${size.height}` : undefined;
}

export type UpstreamImageResponse = {
  payload: unknown;
  requestId: string | null;
};

export async function postImageRequest(
  built: Built,
  apiKey: string,
  extraHeaders: Record<string, string> = {},
): Promise<UpstreamImageResponse> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    ...extraHeaders,
  };
  if (built.kind === "json") headers["Content-Type"] = "application/json";
  const res = await fetch(`${upstreamApiUrl}${built.path}`, {
    method: "POST",
    headers,
    body: built.kind === "json" ? built.body : built.form,
  });
  const text = await res.text();
  if (!res.ok) throw new UpstreamImageError(res.status, text);
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new UpstreamImageError(res.status, text.slice(0, 300));
  }
  return {
    requestId: res.headers.get("x-oneapi-request-id"),
    payload,
  };
}

export async function fetchGeneratedImage(
  uri: string,
  apiKey: string,
  seed?: number,
): Promise<GeneratedImage> {
  const fetched = await downloadGenerationBytes(uri, apiKey);
  const size = await probeImageSize(fetched.buffer);
  return {
    resultUrl: uri.startsWith("data:") ? null : uri,
    base64: fetched.buffer.toString("base64"),
    mimeType: fetched.mime,
    sizeBytes: fetched.sizeBytes,
    width: size.width,
    height: size.height,
    seed,
  };
}

export function collectImages(
  results: ExtractedResult[],
  apiKey: string,
): Promise<GeneratedImage[]> {
  return Promise.all(
    results.map((r) => fetchGeneratedImage(r.uri, apiKey, r.seed)),
  );
}

export function batchPlan(endpointSupportsBatch: boolean, count: number) {
  return {
    calls: endpointSupportsBatch ? 1 : count,
    perCallN: endpointSupportsBatch ? count : 1,
  };
}
