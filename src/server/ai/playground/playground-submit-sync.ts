import {
  buildBody,
  extractResultUris,
  fetchAllRefs,
} from "@/lib/ai/playground/dispatch";
import { getPricingSummary } from "@/lib/api/pricing-cache";
import { downloadGenerationBytes } from "@/lib/config/r2";
import { type SyncImageEndpoint } from "@/lib/ai/playground/models-dynamic";
import type { PlaygroundSubmitBody } from "@/lib/validation/playground";
import { upstreamApiUrl } from "@/server/constants";
import { type GeneratedImage, paramsToSize } from "./playground-finalize";

// Sync-image endpoints answer synchronously: the server downloads every
// result image and returns the bytes inline so the client can persist them.
export async function submitSyncImage(args: {
  apiKey: string;
  body: PlaygroundSubmitBody;
  endpoint: SyncImageEndpoint;
  n: number;
}): Promise<GeneratedImage[]> {
  const { apiKey, body, endpoint, n } = args;
  const params = body.params ?? {};
  const size = paramsToSize(body.params);

  const meta = (await getPricingSummary()).models.find(
    (m) => m.name === body.model,
  );
  const cap = meta?.metadata.maxImageInputs ?? 6;
  const refUrls = (body.references ?? []).slice(0, cap).map((r) => r.url);
  const refs = refUrls.length > 0 ? await fetchAllRefs(refUrls) : [];

  const supportsNativeBatch = endpoint === "image-generation";
  const callsToMake = supportsNativeBatch ? 1 : n;
  const perCallN = supportsNativeBatch ? n : 1;

  const collected: GeneratedImage[] = [];
  for (let i = 0; i < callsToMake; i++) {
    const built = buildBody(endpoint, {
      model: body.model,
      prompt: body.prompt,
      size,
      refs,
      n: perCallN,
      quality: params.quality,
      outputFormat: params.outputFormat,
      watermark: params.watermark,
      background: params.background,
      strength: params.strength,
      seed: params.seed,
    });

    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
    };
    let res: Response;
    if (built.kind === "json") {
      headers["Content-Type"] = "application/json";
      res = await fetch(`${upstreamApiUrl}${built.path}`, {
        method: "POST",
        headers,
        body: built.body,
      });
    } else {
      res = await fetch(`${upstreamApiUrl}${built.path}`, {
        method: "POST",
        headers,
        body: built.form,
      });
    }

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`upstream ${res.status}: ${text.slice(0, 300)}`);
    }
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error(`upstream returned non-JSON: ${text.slice(0, 200)}`);
    }

    const uris = extractResultUris(endpoint, payload);
    if (uris.length === 0) {
      throw new Error(
        `no image in upstream response (${endpoint}): ${text.slice(0, 200)}`,
      );
    }
    for (const uri of uris) {
      const bytes = await downloadGenerationBytes(uri, apiKey);
      collected.push({
        resultUrl: uri.startsWith("data:") ? null : uri,
        base64: bytes.buffer.toString("base64"),
        mimeType: bytes.mime,
        sizeBytes: bytes.sizeBytes,
      });
    }
  }

  return collected;
}
