"use client";

import type { InlayImage } from "@/lib/ai/chat/pipeline/deps";
import { msg } from "@/lib/config/constants";
import {
  base64ToUint8,
  rec,
  recArr,
  uid,
  uint8ToBase64,
} from "@/lib/utils/base";
import {
  fetchProviderMedia,
  providerError,
  providerFetch,
  type ProviderCtx,
} from "@/components/pages/sidebar/chat/runtime/transport/provider-fetch";

const MAX_REFS = 6;

async function toInlay(blob: Blob): Promise<InlayImage> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return {
    id: uid(),
    dataBase64: uint8ToBase64(bytes),
    mimeType: blob.type.split(";")[0]?.trim() || "image/png",
    sizeBytes: bytes.length,
    width: null,
    height: null,
  };
}

// gpt-image models always answer b64_json and refuse response_format, so it is
// never sent; dall-e and most relays answer a url instead.
async function extractImage(
  ctx: ProviderCtx,
  res: Response,
): Promise<InlayImage> {
  if (!res.ok) throw await providerError(res);
  const first = recArr(rec(await res.json())?.data)[0];
  if (typeof first?.b64_json === "string" && first.b64_json) {
    const dataBase64 = first.b64_json.replace(/^data:[^,]*,/, "");
    return {
      id: uid(),
      dataBase64,
      mimeType:
        typeof first.mime_type === "string" ? first.mime_type : "image/png",
      sizeBytes: base64ToUint8(dataBase64).length,
      width: null,
      height: null,
    };
  }
  if (typeof first?.url === "string" && first.url)
    return toInlay(await fetchProviderMedia(ctx, first.url));
  throw new Error(msg("ERRORS.CUSTOM_IMAGE_EMPTY"));
}

async function refToBlob(url: string): Promise<Blob | null> {
  try {
    const res = await fetch(url);
    return res.ok ? await res.blob() : null;
  } catch {
    return null;
  }
}

// JSON `images:[{image_url}]` is OpenAI's current edits shape and the only one
// xAI accepts; older relays take only multipart `image[]`.
async function editImage(
  ctx: ProviderCtx,
  model: string,
  prompt: string,
  refUrls: string[],
  signal?: AbortSignal,
): Promise<Response> {
  const res = await providerFetch(ctx, "/images/edits", {
    json: {
      model,
      prompt,
      n: 1,
      images: refUrls.map((url) => ({ image_url: url })),
    },
    signal,
  });
  if (res.ok || ![400, 415, 422].includes(res.status)) return res;
  const blobs = (await Promise.all(refUrls.map(refToBlob))).filter(
    (b): b is Blob => b != null,
  );
  if (blobs.length === 0) return res;
  const form = new FormData();
  form.set("model", model);
  form.set("prompt", prompt);
  for (const blob of blobs) form.append("image[]", blob, "ref.png");
  return providerFetch(ctx, "/images/edits", { form, signal });
}

export async function generateCustomProviderImage(
  ctx: ProviderCtx,
  model: string,
  prompt: string,
  refUrls: string[] = [],
  signal?: AbortSignal,
): Promise<InlayImage> {
  const refs = refUrls.slice(0, MAX_REFS);
  const res = refs.length
    ? await editImage(ctx, model, prompt, refs, signal)
    : await providerFetch(ctx, "/images/generations", {
        json: { model, prompt, n: 1 },
        signal,
      });
  return extractImage(ctx, res);
}
