// Body builders + extractors for new-api image endpoints
// (/images, /chat, /generateContent).

import type { SyncImageEndpoint } from "@/lib/ai/playground/models-dynamic";
import { safeFetchBytes } from "@/lib/config/r2";
import { base64ToDataUri } from "@/lib/utils/base";

const MAX_REF_BYTES = 10 * 1024 * 1024;

export type RefBytes = {
  buf: Buffer;
  mime: string;
  base64: string;
  dataUri: string;
};

async function fetchRefBytes(url: string): Promise<RefBytes> {
  // SSRF-safe: caller-supplied (guest-reachable) URL goes through the r2
  // allowlist, never a bare fetch that could hit 169.254/RFC1918.
  const { buffer: buf, contentType } = await safeFetchBytes(url, MAX_REF_BYTES);
  const mime = contentType?.split(";")[0]?.trim() || "image/png";
  const base64 = buf.toString("base64");
  return { buf, mime, base64, dataUri: base64ToDataUri(base64, mime) };
}

export async function fetchAllRefs(urls: string[]): Promise<RefBytes[]> {
  return Promise.all(urls.map(fetchRefBytes));
}

export type SubmitArgs = {
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

// Empty array means "no image found"; callers treat as failure.
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
      } else if (
        typeof entry.b64_json === "string" &&
        entry.b64_json.length > 0
      ) {
        out.push(base64ToDataUri(entry.b64_json, "image/png"));
      }
    }
    return out;
  }

  if (endpoint === "openai") {
    const choices = p.choices as Array<Record<string, unknown>> | undefined;
    const msg = (choices?.[0]?.message ?? null) as Record<
      string,
      unknown
    > | null;
    if (!msg) return [];
    // Two shapes: array of parts with image_url, or markdown/data-URI string.
    const content = msg.content;
    if (Array.isArray(content)) {
      for (const part of content) {
        const pp = part as Record<string, unknown>;
        if (pp.type === "image_url") {
          const url = (pp.image_url as Record<string, unknown> | undefined)
            ?.url;
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

  const candidates = p.candidates as Array<Record<string, unknown>> | undefined;
  const parts =
    ((candidates?.[0]?.content as Record<string, unknown> | undefined)
      ?.parts as Array<Record<string, unknown>> | undefined) ?? [];
  for (const part of parts) {
    const inline =
      (part.inline_data as Record<string, unknown> | undefined) ??
      (part.inlineData as Record<string, unknown> | undefined);
    if (!inline) continue;
    const mime = (inline.mime_type ?? inline.mimeType) as string | undefined;
    const data = inline.data as string | undefined;
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
