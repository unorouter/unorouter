// Body builders + extractors for new-api image endpoints (/images, /chat, /generateContent).

import type { SyncImageEndpoint } from "@/lib/ai/playground/models-dynamic";
import { safeFetchBytes } from "@/lib/config/r2";
import { base64ToDataUri } from "@/lib/utils/base";

const MAX_REF_BYTES = 10 * 1024 * 1024;

type RefBytes = {
  buf: Buffer;
  mime: string;
  base64: string;
  dataUri: string;
};

async function fetchRefBytes(url: string): Promise<RefBytes> {
  // SSRF-safe: caller-supplied URL goes through the r2 allowlist, never a bare fetch that could hit RFC1918.
  const { buffer: buf, contentType } = await safeFetchBytes(url, MAX_REF_BYTES);
  const mime = contentType?.split(";")[0]?.trim() || "image/png";
  const base64 = buf.toString("base64");
  return { buf, mime, base64, dataUri: base64ToDataUri(base64, mime) };
}

export async function fetchAllRefs(urls: string[]): Promise<RefBytes[]> {
  return Promise.all(urls.map(fetchRefBytes));
}

function dataUriToRefBytes(dataUri: string): RefBytes {
  const header = dataUri.slice(0, dataUri.indexOf(","));
  const mime = header.match(/data:([^;]+)/)?.[1]?.trim() || "image/png";
  const base64 = dataUri.slice(dataUri.indexOf(",") + 1);
  const buf = Buffer.from(base64, "base64");
  return { buf, mime, base64, dataUri };
}

// Chat refs arrive as inline data: URIs (OPFS bytes) or http(s) R2 urls. Decode
// data URIs locally; http urls go through the SSRF-safe fetch.
export async function loadRefs(urls: string[]): Promise<RefBytes[]> {
  return Promise.all(
    urls.map((url) =>
      url.startsWith("data:")
        ? Promise.resolve(dataUriToRefBytes(url))
        : fetchRefBytes(url),
    ),
  );
}

type SubmitArgs = {
  model: string;
  prompt: string;
  size?: string;
  refs: RefBytes[];
  /** OAI image-gen native n>1; chat/gemini caller loops. */
  n?: number;
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

function buildImageGenerationsBody(args: SubmitArgs): Built {
  const fields = (
    [
      ["model", args.model],
      ["prompt", args.prompt],
      ["n", args.n ?? 1],
      ["size", args.size],
      ["quality", args.quality],
      ["output_format", args.outputFormat],
      ["background", args.background],
      ["watermark", args.watermark],
      ["seed", args.seed],
    ] as Array<[string, unknown]>
  ).filter(([, v]) => v !== undefined && v !== "");
  if (args.refs.length === 0) {
    return {
      kind: "json",
      path: "/v1/images/generations",
      body: JSON.stringify(Object.fromEntries(fields)),
    };
  }
  const form = new FormData();
  for (const [k, v] of fields) form.append(k, String(v));
  for (const r of args.refs) {
    const blob = new Blob([new Uint8Array(r.buf)], { type: r.mime });
    form.append(
      "image[]",
      blob,
      `ref-${form.getAll("image[]").length}.${mimeExt(r.mime)}`,
    );
  }
  return { kind: "multipart", path: "/v1/images/edits", form };
}

function buildChatCompletionsBody(args: SubmitArgs): Built {
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
  // ByteDance / wan adapters route via openai endpoint and pass extras through.
  if (args.watermark !== undefined) body.watermark = args.watermark;
  if (args.seed !== undefined) body.seed = args.seed;
  if (args.strength !== undefined) body.strength = args.strength;
  return {
    kind: "json",
    path: "/v1/chat/completions",
    body: JSON.stringify(body),
  };
}

function buildGeminiGenerateBody(args: SubmitArgs): Built {
  type Part =
    | { text: string }
    | { inline_data: { mime_type: string; data: string } };
  const parts: Part[] = [{ text: args.prompt }];
  for (const r of args.refs) {
    parts.push({ inline_data: { mime_type: r.mime, data: r.base64 } });
  }
  // gemini relay maps `quality` to imageSize (1K/2K) and `size` to aspectRatio.
  const generationConfig: Record<string, unknown> = {
    responseModalities: ["IMAGE"],
  };
  if (args.quality) generationConfig.imageSize = args.quality;
  if (args.seed !== undefined) generationConfig.seed = args.seed;
  const body: Record<string, unknown> = {
    contents: [{ parts }],
    generationConfig,
  };
  return {
    kind: "json",
    path: `/v1beta/models/${encodeURIComponent(args.model)}:generateContent`,
    body: JSON.stringify(body),
  };
}

export function buildBody(
  endpoint: SyncImageEndpoint,
  args: SubmitArgs,
): Built {
  switch (endpoint) {
    case "image-generation":
      return buildImageGenerationsBody(args);
    case "openai":
      return buildChatCompletionsBody(args);
    case "gemini":
      return buildGeminiGenerateBody(args);
  }
}

// Guards for walking untyped upstream JSON; centralizes the narrowing so the extractors stay cast-free.
type JsonRecord = Record<string, unknown>;
function rec(v: unknown): JsonRecord | undefined {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as JsonRecord)
    : undefined;
}
function str(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}
function recArray(v: unknown): JsonRecord[] {
  if (!Array.isArray(v)) return [];
  const out: JsonRecord[] = [];
  for (const x of v) {
    const r = rec(x);
    if (r) out.push(r);
  }
  return out;
}

// Empty array means "no image found"; callers treat as failure.
export function extractResultUris(
  endpoint: SyncImageEndpoint,
  payload: unknown,
): string[] {
  const p = rec(payload);
  if (!p) return [];
  const out: string[] = [];

  if (endpoint === "image-generation") {
    for (const entry of recArray(p.data)) {
      const url = str(entry.url);
      const b64 = str(entry.b64_json);
      if (url) out.push(url);
      else if (b64) out.push(base64ToDataUri(b64, "image/png"));
    }
    return out;
  }

  if (endpoint === "openai") {
    const msg = rec(recArray(p.choices)[0]?.message);
    if (!msg) return [];
    // Two shapes: array of parts with image_url, or markdown/data-URI string.
    const content = msg.content;
    if (Array.isArray(content)) {
      for (const part of content) {
        const pp = rec(part);
        if (pp?.type === "image_url") {
          const url = str(rec(pp.image_url)?.url);
          if (url) out.push(url);
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

  const parts = recArray(rec(recArray(p.candidates)[0]?.content)?.parts);
  for (const part of parts) {
    const inline = rec(part.inline_data) ?? rec(part.inlineData);
    if (!inline) continue;
    const mime = str(inline.mime_type) ?? str(inline.mimeType);
    const data = str(inline.data);
    if (mime && data) out.push(base64ToDataUri(data, mime));
  }
  return out;
}

function extractFromMarkdownOrText(text: string): string | null {
  const md = text.match(
    /!\[[^\]]*\]\((https?:\/\/[^\s)]+|data:image\/[^\s)]+)\)/,
  );
  if (md?.[1]) return md[1];
  const data = text.match(/data:image\/[^\s)]+/);
  if (data?.[0]) return data[0];
  const url = text.match(/https?:\/\/\S+\.(?:png|jpe?g|webp|gif)/i);
  if (url?.[0]) return url[0];
  return null;
}

function mimeExt(mime: string): string {
  const m = mime.toLowerCase();
  if (m.includes("png")) return "png";
  if (m.includes("webp")) return "webp";
  if (m.includes("gif")) return "gif";
  return "jpg";
}
