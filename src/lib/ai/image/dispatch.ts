import { API_ENDPOINTS } from "@/lib/ai/endpoints";

export const SYNC_IMAGE_ENDPOINTS = [
  "image-generation",
  "openai",
  "gemini",
] as const;
export type SyncImageEndpoint = (typeof SYNC_IMAGE_ENDPOINTS)[number];
import { safeFetchBytes } from "@/lib/config/safe-fetch";
import {
  base64ToDataUri,
  nonEmptyString as str,
  rec,
  recArr,
} from "@/lib/utils/base";

const MAX_REF_BYTES = 10 * 1024 * 1024;

type RefBytes = {
  buf: Buffer;
  mime: string;
  base64: string;
  dataUri: string;
};

async function fetchRefBytes(url: string): Promise<RefBytes> {
  const { buffer: buf, contentType } = await safeFetchBytes(url, MAX_REF_BYTES);
  const mime = contentType?.split(";")[0]?.trim() || "image/png";
  const base64 = buf.toString("base64");
  return { buf, mime, base64, dataUri: base64ToDataUri(base64, mime) };
}

function dataUriToRefBytes(dataUri: string): RefBytes {
  const header = dataUri.slice(0, dataUri.indexOf(","));
  const mime = header.match(/data:([^;]+)/)?.[1]?.trim() || "image/png";
  const base64 = dataUri.slice(dataUri.indexOf(",") + 1);
  const buf = Buffer.from(base64, "base64");
  return { buf, mime, base64, dataUri };
}

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
  n?: number;
  quality?: string;
  outputFormat?: string;
  watermark?: boolean;
  background?: string;
  strength?: number;
  seed?: number;
  /** Rides as extra top-level JSON keys, outside the OpenAI image schema. */
  diffusion?: Record<string, unknown>;
};

export type Built =
  | { kind: "json"; path: string; body: string }
  | { kind: "multipart"; path: string; form: FormData };

function buildImageGenerationsBody(args: SubmitArgs): Built {
  const all: Array<[string, unknown]> = [
    ["model", args.model],
    ["prompt", args.prompt],
    ["n", args.n ?? 1],
    ["size", args.size],
    ["quality", args.quality],
    ["output_format", args.outputFormat],
    ["background", args.background],
    ["watermark", args.watermark],
    ["seed", args.seed],
  ];
  const fields = all.filter(([, v]) => v !== undefined && v !== "");
  for (const [k, v] of Object.entries(args.diffusion ?? {})) {
    if (v !== undefined && v !== null && v !== "") fields.push([k, v]);
  }
  if (args.refs.length === 0) {
    return {
      kind: "json",
      path: API_ENDPOINTS.imagesGenerations,
      body: JSON.stringify(Object.fromEntries(fields)),
    };
  }
  const form = new FormData();
  for (const [k, v] of fields) {
    form.append(k, typeof v === "object" ? JSON.stringify(v) : String(v));
  }
  for (const r of args.refs) {
    const blob = new Blob([new Uint8Array(r.buf)], { type: r.mime });
    form.append(
      "image[]",
      blob,
      `ref-${form.getAll("image[]").length}.${mimeExt(r.mime)}`,
    );
  }
  return { kind: "multipart", path: API_ENDPOINTS.imagesEdits, form };
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
  if (args.watermark !== undefined) body.watermark = args.watermark;
  if (args.seed !== undefined) body.seed = args.seed;
  if (args.strength !== undefined) body.strength = args.strength;
  return {
    kind: "json",
    path: API_ENDPOINTS.chatCompletions,
    body: JSON.stringify(body),
  };
}

function buildGeminiGenerateBody(args: SubmitArgs): Built {
  type Part =
    { text: string } | { inline_data: { mime_type: string; data: string } };
  const parts: Part[] = [{ text: args.prompt }];
  for (const r of args.refs) {
    parts.push({ inline_data: { mime_type: r.mime, data: r.base64 } });
  }
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

export function extractResultUris(
  endpoint: SyncImageEndpoint,
  payload: unknown,
): string[] {
  return extractResults(endpoint, payload).map((r) => r.uri);
}

export type ExtractedResult = { uri: string; seed?: number };

export function extractResults(
  endpoint: SyncImageEndpoint,
  payload: unknown,
): ExtractedResult[] {
  const p = rec(payload);
  if (!p) return [];
  const out: ExtractedResult[] = [];

  if (endpoint === "image-generation") {
    for (const entry of recArr(p.data)) {
      const url = str(entry.url);
      const b64 = str(entry.b64_json);
      const rawSeed = entry.seed;
      const seed = typeof rawSeed === "number" ? rawSeed : undefined;
      if (url) out.push({ uri: url, seed });
      else if (b64) out.push({ uri: base64ToDataUri(b64, "image/png"), seed });
    }
    return out;
  }

  if (endpoint === "openai") {
    const msg = rec(recArr(p.choices)[0]?.message);
    if (!msg) return [];
    const content = msg.content;
    if (Array.isArray(content)) {
      for (const part of content) {
        const pp = rec(part);
        if (pp?.type === "image_url") {
          const url = str(rec(pp.image_url)?.url);
          if (url) out.push({ uri: url });
        }
      }
      return out;
    }
    if (typeof content === "string") {
      const found = extractFromMarkdownOrText(content);
      if (found) out.push({ uri: found });
    }
    return out;
  }

  const parts = recArr(rec(recArr(p.candidates)[0]?.content)?.parts);
  for (const part of parts) {
    const inline = rec(part.inline_data) ?? rec(part.inlineData);
    if (!inline) continue;
    const mime = str(inline.mime_type) ?? str(inline.mimeType);
    const data = str(inline.data);
    if (mime && data) out.push({ uri: base64ToDataUri(data, mime) });
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
