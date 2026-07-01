"use client";

// BYOK in-chat image generation (Risu openai-compat parity): the browser calls the user's OWN
// OpenAI-compatible endpoint directly with their key - our server is never involved (same trust model as
// the custom TEXT path). Text-to-image goes to {base}/images/generations; with reference images it becomes
// a multipart {base}/images/edits call (OAI edits shape, mirroring the playground dispatch).

import { normalizeBaseUrl } from "@/lib/ai/chat/custom-provider-id";
import type { InlayImage } from "@/lib/ai/chat/pipeline/deps";
import { uid } from "@/lib/utils/base";

type OaiImageResponse = {
  data?: Array<{ b64_json?: string; url?: string }>;
  error?: { message?: string };
};

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

function dataUriToBlob(dataUri: string): Blob {
  const comma = dataUri.indexOf(",");
  const mime =
    dataUri
      .slice(0, comma)
      .match(/data:([^;]+)/)?.[1]
      ?.trim() || "image/png";
  const bin = atob(dataUri.slice(comma + 1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function refToBlob(url: string): Promise<Blob | null> {
  if (url.startsWith("data:")) return dataUriToBlob(url);
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null; // CORS/network: drop the ref, keep generating
  }
}

async function extractImage(res: Response): Promise<InlayImage> {
  const body = (await res.json()) as OaiImageResponse;
  if (!res.ok) {
    throw new Error(
      body.error?.message || `Image request failed (${res.status})`,
    );
  }
  const first = body.data?.[0];
  if (first?.b64_json) {
    const bytes = atob(first.b64_json);
    return {
      id: uid(),
      dataBase64: first.b64_json,
      mimeType: "image/png",
      sizeBytes: bytes.length,
    };
  }
  if (first?.url) {
    // URL-returning providers: fetch the bytes client-side (CORS best-effort).
    const imgRes = await fetch(first.url);
    if (!imgRes.ok) throw new Error(`Image download failed (${imgRes.status})`);
    const buf = new Uint8Array(await imgRes.arrayBuffer());
    return {
      id: uid(),
      dataBase64: bytesToBase64(buf),
      mimeType:
        imgRes.headers.get("content-type")?.split(";")[0]?.trim() ||
        "image/png",
      sizeBytes: buf.length,
    };
  }
  throw new Error("Image response contained no image");
}

export async function generateCustomProviderImage(
  provider: { baseUrl: string; apiKey: string },
  modelKey: string,
  prompt: string,
  refUrls: string[] = [],
): Promise<InlayImage | null> {
  const base = normalizeBaseUrl(provider.baseUrl);
  const key = provider.apiKey.trim().replace(/^Bearer\s+/i, "");
  const auth: Record<string, string> = key
    ? { Authorization: `Bearer ${key}` }
    : {};

  const refBlobs = (
    await Promise.all(refUrls.slice(0, 6).map(refToBlob))
  ).filter((b): b is Blob => b != null);

  if (refBlobs.length > 0) {
    const form = new FormData();
    form.set("model", modelKey);
    form.set("prompt", prompt);
    form.set("response_format", "b64_json");
    for (const blob of refBlobs) form.append("image[]", blob, "ref.png");
    const res = await fetch(`${base}/images/edits`, {
      method: "POST",
      headers: auth,
      body: form,
    });
    return extractImage(res);
  }

  const res = await fetch(`${base}/images/generations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...auth },
    body: JSON.stringify({
      model: modelKey,
      prompt,
      n: 1,
      response_format: "b64_json",
    }),
  });
  return extractImage(res);
}
