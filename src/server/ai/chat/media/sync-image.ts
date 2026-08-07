import {
  buildBody,
  extractResultUris,
  fetchAllRefs,
} from "@/lib/ai/playground/dispatch";
import { getPricingSnapshot } from "@/server/models/pricing/pricing-snapshot";
import { downloadGenerationBytes } from "@/lib/config/safe-fetch";
import { type SyncImageEndpoint } from "@/lib/ai/playground/models-dynamic";
import type {
  GeneratedImage,
  PlaygroundSubmitBody,
} from "@/lib/validation/playground";
import { upstreamApiUrl } from "@/server/constants";

// Sync image generation shared by the chat inlay/illustrator. Formerly lived in
// the playground vertical (playground-submit-sync.ts); the playground UI was
// removed but the isomorphic image-gen engine under src/lib/ai/playground/ +
// this submit path are reused by in-chat image generation, so they stay here
// under chat/media.
function paramsToSize(
  params: PlaygroundSubmitBody["params"],
): string | undefined {
  const p = params ?? {};
  return p.width && p.height ? `${p.width}x${p.height}` : undefined;
}

export async function submitSyncImage(args: {
  apiKey: string;
  body: PlaygroundSubmitBody;
  endpoint: SyncImageEndpoint;
  n: number;
}): Promise<GeneratedImage[]> {
  const params = args.body.params ?? {};
  const size = paramsToSize(args.body.params);

  const meta = (await getPricingSnapshot()).models.find(
    (m) => m.name === args.body.model,
  );
  const cap = meta?.metadata.maxImageInputs ?? 6;
  const refUrls = (args.body.references ?? []).slice(0, cap).map((r) => r.url);
  const refs = refUrls.length > 0 ? await fetchAllRefs(refUrls) : [];

  const supportsNativeBatch = args.endpoint === "image-generation";
  const callsToMake = supportsNativeBatch ? 1 : args.n;
  const perCallN = supportsNativeBatch ? args.n : 1;

  const collected: GeneratedImage[] = [];
  for (let i = 0; i < callsToMake; i++) {
    const built = buildBody(args.endpoint, {
      model: args.body.model,
      prompt: args.body.prompt,
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
      Authorization: `Bearer ${args.apiKey}`,
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

    const uris = extractResultUris(args.endpoint, payload);
    if (uris.length === 0) {
      throw new Error(
        `no image in upstream response (${args.endpoint}): ${text.slice(0, 200)}`,
      );
    }
    for (const uri of uris) {
      const bytes = await downloadGenerationBytes(uri, args.apiKey);
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
