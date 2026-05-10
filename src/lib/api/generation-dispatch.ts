// Body construction + result extraction for the three sync image-model
// endpoints exposed by new-api: /v1/images/generations (+ /edits multipart),
// /v1/chat/completions (multimodal), /v1beta/models/{model}:generateContent.
//
// Each builder turns the unorouter form's normalized shape (prompt, refs as
// R2 URLs, optional size) into the vendor-shaped request body. References
// are fetched once and re-encoded per endpoint:
//   - /v1/images/edits expects multipart `image[]` bytes
//   - /v1/chat/completions accepts data: URIs in image_url parts
//   - :generateContent expects {inline_data: {mime_type, data: <base64>}}
//
// Extractors do the inverse: pull a URL or data URI out of each vendor's
// response so generation.service.ts can hand a single value to
// downloadAndUploadGeneration.

import type { SyncImageEndpoint } from "@/lib/config/generation-models-dynamic";

// ---------- Reference fetching ----------

const MAX_REF_BYTES = 10 * 1024 * 1024;

export type RefBytes = {
  buf: Buffer;
  mime: string;
  base64: string;
  dataUri: string;
};

export async function fetchRefBytes(url: string): Promise<RefBytes> {
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    throw new Error(`reference fetch failed: ${res.status} ${url}`);
  }
  const contentLength = res.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_REF_BYTES) {
    throw new Error(`reference too large: ${contentLength} bytes`);
  }
  const arr = await res.arrayBuffer();
  if (arr.byteLength > MAX_REF_BYTES) {
    throw new Error(`reference too large: ${arr.byteLength} bytes`);
  }
  const buf = Buffer.from(arr);
  const mime = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";
  const base64 = buf.toString("base64");
  return { buf, mime, base64, dataUri: `data:${mime};base64,${base64}` };
}

export async function fetchAllRefs(urls: string[]): Promise<RefBytes[]> {
  return Promise.all(urls.map(fetchRefBytes));
}

// ---------- Body builders ----------

export type SubmitArgs = {
  model: string;
  prompt: string;
  size?: string;
  refs: RefBytes[];
  /** Number of images to ask for in a single upstream call. OAI image-
   *  generation supports n>1 natively; chat / gemini ignore this and the
   *  caller must loop instead. Defaults to 1 if unset. */
  n?: number;
  // Vendor knobs - only fields the relay adapter for the chosen model
  // actually consumes are forwarded. The form renders a control only
  // when the descriptor flag is set, so unset values stay undefined.
  quality?: string;
  outputFormat?: string;
  watermark?: boolean;
  background?: string;
  strength?: number;
  seed?: number;
};

export type Built =
  | { kind: "json"; path: string; body: string }
  | { kind: "multipart"; path: string; form: FormData };

export function buildImageGenerationsBody(args: SubmitArgs): Built {
  const n = args.n ?? 1;
  if (args.refs.length === 0) {
    const body: Record<string, unknown> = {
      model: args.model,
      prompt: args.prompt,
      n,
    };
    if (args.size) body.size = args.size;
    if (args.quality) body.quality = args.quality;
    if (args.outputFormat) body.output_format = args.outputFormat;
    if (args.background) body.background = args.background;
    if (args.watermark !== undefined) body.watermark = args.watermark;
    if (args.seed !== undefined) body.seed = args.seed;
    return {
      kind: "json",
      path: "/v1/images/generations",
      body: JSON.stringify(body),
    };
  }
  // /v1/images/edits — multipart, one or more `image[]` parts.
  const form = new FormData();
  form.append("model", args.model);
  form.append("prompt", args.prompt);
  form.append("n", String(n));
  if (args.size) form.append("size", args.size);
  if (args.quality) form.append("quality", args.quality);
  if (args.outputFormat) form.append("output_format", args.outputFormat);
  if (args.background) form.append("background", args.background);
  if (args.watermark !== undefined)
    form.append("watermark", String(args.watermark));
  if (args.seed !== undefined) form.append("seed", String(args.seed));
  for (const r of args.refs) {
    const blob = new Blob([new Uint8Array(r.buf)], { type: r.mime });
    form.append("image[]", blob, `ref-${form.getAll("image[]").length}.${mimeExt(r.mime)}`);
  }
  return { kind: "multipart", path: "/v1/images/edits", form };
}

export function buildChatCompletionsBody(args: SubmitArgs): Built {
  type Part =
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } };
  const content: Part[] = [{ type: "text", text: args.prompt }];
  for (const r of args.refs) {
    content.push({ type: "image_url", image_url: { url: r.dataUri } });
  }
  const body: Record<string, unknown> = {
    model: args.model,
    messages: [{ role: "user", content }],
    modalities: ["image", "text"],
    n: 1,
  };
  // ByteDance / wan adapters route via openai endpoint and pass extra
  // fields through unchanged. Surface them on the request body so the
  // upstream provider sees them.
  if (args.watermark !== undefined) body.watermark = args.watermark;
  if (args.seed !== undefined) body.seed = args.seed;
  if (args.strength !== undefined) body.strength = args.strength;
  return {
    kind: "json",
    path: "/v1/chat/completions",
    body: JSON.stringify(body),
  };
}

export function buildGeminiGenerateBody(args: SubmitArgs): Built {
  type Part =
    | { text: string }
    | { inline_data: { mime_type: string; data: string } };
  const parts: Part[] = [{ text: args.prompt }];
  for (const r of args.refs) {
    parts.push({ inline_data: { mime_type: r.mime, data: r.base64 } });
  }
  // The new-api gemini relay maps `quality` to imageSize (1K/2K) and
  // `size` (e.g. 1024x1024) to aspectRatio. Surface both at the top level
  // so the adapter can read them off the OpenAI-shaped wrapper before
  // translating to Gemini's native generationConfig.
  const generationConfig: Record<string, unknown> = {
    responseModalities: ["IMAGE"],
  };
  if (args.quality) generationConfig.imageSize = args.quality;
  const body: Record<string, unknown> = {
    contents: [{ parts }],
    generationConfig,
  };
  if (args.seed !== undefined) (body.generationConfig as Record<string, unknown>).seed = args.seed;
  return {
    kind: "json",
    path: `/v1beta/models/${encodeURIComponent(args.model)}:generateContent`,
    body: JSON.stringify(body),
  };
}

export function buildBody(endpoint: SyncImageEndpoint, args: SubmitArgs): Built {
  switch (endpoint) {
    case "image-generation":
      return buildImageGenerationsBody(args);
    case "openai":
      return buildChatCompletionsBody(args);
    case "gemini":
      return buildGeminiGenerateBody(args);
  }
}

// ---------- Result extraction ----------

// Each vendor returns image URLs or bytes in a different shape. Returns
// an array of public URLs or data: URIs ready for downloadAndUploadGeneration.
// Empty array means "no image found" - callers should treat as failure.
export function extractResultUris(
  endpoint: SyncImageEndpoint,
  payload: unknown,
): string[] {
  if (!payload || typeof payload !== "object") return [];
  const p = payload as Record<string, unknown>;
  const out: string[] = [];

  if (endpoint === "image-generation") {
    const data = (p.data as Array<Record<string, unknown>> | undefined) ?? [];
    for (const entry of data) {
      if (typeof entry.url === "string" && entry.url.length > 0) {
        out.push(entry.url);
      } else if (typeof entry.b64_json === "string" && entry.b64_json.length > 0) {
        out.push(`data:image/png;base64,${entry.b64_json}`);
      }
    }
    return out;
  }

  if (endpoint === "openai") {
    const choices = p.choices as Array<Record<string, unknown>> | undefined;
    const msg = (choices?.[0]?.message ?? null) as Record<string, unknown> | null;
    if (!msg) return [];
    // Two common shapes: array of parts with image_url, or markdown/data-URI string.
    const content = msg.content;
    if (Array.isArray(content)) {
      for (const part of content) {
        const pp = part as Record<string, unknown>;
        if (pp.type === "image_url") {
          const url = (pp.image_url as Record<string, unknown> | undefined)?.url;
          if (typeof url === "string" && url.length > 0) out.push(url);
        }
      }
      return out;
    }
    if (typeof content === "string") {
      const found = extractFromMarkdownOrText(content);
      if (found) out.push(found);
    }
    return out;
  }

  // gemini
  const candidates = p.candidates as Array<Record<string, unknown>> | undefined;
  const parts = (
    (candidates?.[0]?.content as Record<string, unknown> | undefined)?.parts as
      | Array<Record<string, unknown>>
      | undefined
  ) ?? [];
  for (const part of parts) {
    const inline =
      (part.inline_data as Record<string, unknown> | undefined) ??
      (part.inlineData as Record<string, unknown> | undefined);
    if (!inline) continue;
    const mime = (inline.mime_type ?? inline.mimeType) as string | undefined;
    const data = inline.data as string | undefined;
    if (mime && data) out.push(`data:${mime};base64,${data}`);
  }
  return out;
}

function extractFromMarkdownOrText(text: string): string | null {
  // Markdown image: ![alt](url)
  const md = text.match(/!\[[^\]]*\]\((https?:\/\/[^\s)]+|data:image\/[^\s)]+)\)/);
  if (md?.[1]) return md[1];
  // Bare data URI
  const data = text.match(/data:image\/[^\s)]+/);
  if (data?.[0]) return data[0];
  // Bare https URL ending in image extension
  const url = text.match(/https?:\/\/\S+\.(?:png|jpe?g|webp|gif)/i);
  if (url?.[0]) return url[0];
  return null;
}

// ---------- Helpers ----------

function mimeExt(mime: string): string {
  const m = mime.toLowerCase();
  if (m.includes("png")) return "png";
  if (m.includes("webp")) return "webp";
  if (m.includes("gif")) return "gif";
  return "jpg";
}
