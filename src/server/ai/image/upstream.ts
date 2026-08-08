import type { Built, ExtractedResult } from "@/lib/ai/playground/dispatch";
import { downloadGenerationBytes } from "@/lib/config/safe-fetch";
import type {
  GeneratedImage,
  PlaygroundSubmitBody,
} from "@/lib/validation/playground";
import { upstreamApiUrl } from "@/server/constants";

// JSON bodies pass VERBATIM: the image client extracts .error.message from them, and
// any prefix makes the string neither plain text nor parseable JSON.
function formatUpstreamError(status: number, body: string): string {
  const trimmed = body.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return trimmed;
  return trimmed ? `${status}: ${trimmed.slice(0, 300)}` : `upstream ${status}`;
}

// One transport error for all three submit paths; callers that need a different
// user-facing shape (the chat stream digs a plain message) re-format from status/body.
export class UpstreamImageError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(formatUpstreamError(status, body));
  }
}

export type UpstreamSize = { width: number; height: number };

// A hires pass is the same render at a larger size: the multiplier becomes the
// requested size and the source rides as init image (re-diffused, not resampled).
export function sizeOf(
  params: PlaygroundSubmitBody["params"],
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

// Posts one built request to the gateway; json and multipart bodies dispatch the same
// way. Guards the parse: an edge 5xx serves HTML, which must surface as an upstream
// error rather than a raw SyntaxError.
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
    // The real charge is only knowable from the gateway's log row, keyed by this id.
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
  return {
    resultUrl: uri.startsWith("data:") ? null : uri,
    base64: fetched.buffer.toString("base64"),
    mimeType: fetched.mime,
    sizeBytes: fetched.sizeBytes,
    seed,
  };
}

export async function collectImages(
  results: ExtractedResult[],
  apiKey: string,
): Promise<GeneratedImage[]> {
  const out: GeneratedImage[] = [];
  for (const result of results) {
    out.push(await fetchGeneratedImage(result.uri, apiKey, result.seed));
  }
  return out;
}

// Hosted image APIs take a native n; everything else is one call per image.
export function batchPlan(endpointSupportsBatch: boolean, count: number) {
  return {
    calls: endpointSupportsBatch ? 1 : count,
    perCallN: endpointSupportsBatch ? count : 1,
  };
}
