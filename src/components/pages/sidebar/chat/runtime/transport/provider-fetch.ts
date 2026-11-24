"use client";

import {
  normalizeBaseUrl,
  parseCustomModelId,
} from "@/lib/ai/chat/custom-provider-id";
import { msg } from "@/lib/config/constants";
import { customProviderStore } from "@/lib/db/client/data/rp/custom-providers";
import { rec } from "@/lib/utils/base";
import type { CustomProviderModelType } from "@/lib/validation/custom-provider";

export type ProviderCtx = { base: string; key: string; proxied: boolean };

const FORWARD = "/api/ai/chat/custom-forward";

export async function resolveCustomModel(modelId: string): Promise<{
  ctx: ProviderCtx;
  model: string;
  type: CustomProviderModelType;
} | null> {
  const parsed = parseCustomModelId(modelId);
  if (!parsed) return null;
  const provider = await customProviderStore.get(parsed.providerId);
  if (!provider) return null;
  const row = provider.models.find((m) => m.key === parsed.modelKey);
  return {
    ctx: {
      base: normalizeBaseUrl(provider.baseUrl),
      key: provider.apiKey.trim().replace(/^Bearer\s+/i, ""),
      proxied: provider.proxy === true,
    },
    model: parsed.modelKey,
    type: row?.type ?? "text",
  };
}

export function providerFetch(
  ctx: ProviderCtx,
  path: string,
  init: {
    method?: "GET" | "POST";
    json?: unknown;
    form?: FormData;
    signal?: AbortSignal;
  } = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    ...(ctx.key ? { Authorization: `Bearer ${ctx.key}` } : {}),
    ...(ctx.proxied ? { "x-proxy-target": ctx.base } : {}),
    ...(init.json !== undefined ? { "Content-Type": "application/json" } : {}),
  };
  return fetch(ctx.proxied ? `${FORWARD}${path}` : `${ctx.base}${path}`, {
    method:
      init.method ?? (init.json !== undefined || init.form ? "POST" : "GET"),
    headers,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.form,
    signal: init.signal,
  });
}

// OpenAI style `{error:{message}}`, new-api's `{message}`, or plain text.
export async function providerError(res: Response): Promise<Error> {
  const text = await res.text().catch(() => "");
  let message = "";
  try {
    const body = rec(JSON.parse(text));
    const error = body?.error;
    message =
      (typeof error === "string" ? error : String(rec(error)?.message ?? "")) ||
      String(body?.message ?? body?.fail_reason ?? "");
  } catch {
    message = text.slice(0, 300);
  }
  return new Error(message.trim() || msg("ERRORS.PROVIDER_REQUEST_FAILED"));
}

// The key goes only to the provider's own origin: a result URL on a CDN or
// another host must never see it.
export async function fetchProviderMedia(
  ctx: ProviderCtx,
  rawUrl: string,
  signal?: AbortSignal,
): Promise<Blob> {
  if (rawUrl.startsWith("data:")) return (await fetch(rawUrl)).blob();
  const url = new URL(rawUrl, `${ctx.base}/`).toString();
  const sameOrigin = new URL(url).origin === new URL(ctx.base).origin;
  const auth: Record<string, string> =
    sameOrigin && ctx.key ? { Authorization: `Bearer ${ctx.key}` } : {};
  if (!ctx.proxied) {
    try {
      const res = await fetch(url, { headers: auth, signal });
      if (res.ok) return await res.blob();
      if (res.status !== 0) throw await providerError(res);
    } catch (err) {
      if (signal?.aborted) throw err;
      if (!(err instanceof TypeError)) throw err;
    }
  }
  const res = await fetch(`${FORWARD}/media?url=${encodeURIComponent(url)}`, {
    headers: { ...auth, "x-proxy-target": ctx.base },
    signal,
  });
  if (res.status === 401) throw new Error(msg("ERRORS.CUSTOM_MEDIA_LOGIN"));
  if (!res.ok) throw await providerError(res);
  return res.blob();
}
