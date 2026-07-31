import {
  buildBody,
  extractResultUris,
  loadRefs,
} from "@/lib/ai/playground/dispatch";
import { getPricingSummary } from "@/lib/api/pricing-cache";
import {
  chooseEndpoint,
  getEffectiveGenerationModels,
} from "@/lib/ai/playground/models-dynamic";
import { downloadGenerationBytes } from "@/lib/config/safe-fetch";
import type {
  GeneratedImage,
  LoraEntry,
  PlaygroundSubmitBody,
} from "@/lib/validation/playground";
import { MAX_IMAGES_PER_GEN } from "@/lib/validation/playground";
import { upstreamApiUrl } from "@/server/constants";
import {
  capReferences,
  filterLorasToCapabilities,
  filterParamsToCapabilities,
} from "./capabilities";

function imageCountFor(body: PlaygroundSubmitBody): number {
  const n = body.params?.n ?? 1;
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(MAX_IMAGES_PER_GEN, Math.floor(n));
}

function paramsToSize(
  params: PlaygroundSubmitBody["params"],
): string | undefined {
  const p = params ?? {};
  return p.width && p.height ? `${p.width}x${p.height}` : undefined;
}

// Knobs the OpenAI image schema has no field for. They ride as extra top-level keys and the
// gateway adaptor maps them onto the provider's own names.
function diffusionParams(
  params: Record<string, unknown>,
  loras: LoraEntry[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const copy = (key: string) => {
    if (params[key] !== undefined) out[key] = params[key];
  };
  copy("steps");
  copy("cfg");
  copy("sampler");
  copy("scheduler");
  copy("clipSkip");
  copy("negativePrompt");
  if (loras.length) {
    out.loras = loras.map((l) => ({ name: l.name, weight: l.weight }));
  }
  return out;
}

export type SubmitGenerationResult = {
  kind: "sync";
  status: "success";
  images: GeneratedImage[];
  droppedParams: string[];
};

export async function submitGeneration(
  apiKey: string,
  body: PlaygroundSubmitBody,
): Promise<SubmitGenerationResult> {
  const requestedCount = imageCountFor(body);
  const summary = await getPricingSummary();

  const info = summary.byName.get(body.model);
  if (!info) throw new Error(`model ${body.model} not in catalog`);
  const endpoint = chooseEndpoint(info.endpointTypes ?? []);
  if (!endpoint) {
    throw new Error(`model ${body.model} declares no supported endpoint`);
  }

  // Enforce the model's declared capabilities server-side. The form gates the same flags, but
  // a request that did not come from the form must not be able to smuggle unsupported knobs.
  const descriptor = getEffectiveGenerationModels(summary.models).find(
    (d) => d.id === body.model,
  );
  if (!descriptor) throw new Error(`model ${body.model} is not generatable`);

  const filtered = filterParamsToCapabilities(descriptor, body.params);
  const loras = filterLorasToCapabilities(descriptor, body.loras);
  const references = capReferences(descriptor, body.references);

  const params = filtered.params as Record<string, unknown>;
  const size = paramsToSize(filtered.params);
  // References may be data URIs: the browser holds the bytes and there is no object storage.
  const refs = references.length
    ? await loadRefs(references.map((r) => r.url))
    : [];

  const supportsNativeBatch = endpoint === "image-generation";
  const callsToMake = supportsNativeBatch ? 1 : requestedCount;
  const perCallN = supportsNativeBatch ? requestedCount : 1;

  const collected: GeneratedImage[] = [];
  for (let i = 0; i < callsToMake; i++) {
    const built = buildBody(endpoint, {
      model: body.model,
      prompt: body.prompt,
      size,
      refs,
      n: perCallN,
      quality: params.quality as string | undefined,
      outputFormat: params.outputFormat as string | undefined,
      watermark: params.watermark as boolean | undefined,
      background: params.background as string | undefined,
      strength: params.strength as number | undefined,
      seed: params.seed as number | undefined,
      diffusion: diffusionParams(params, loras),
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
    const uris = extractResultUris(endpoint, JSON.parse(text));
    for (const uri of uris) {
      const fetched = await downloadGenerationBytes(uri, apiKey);
      collected.push({
        resultUrl: uri.startsWith("data:") ? null : uri,
        base64: fetched.buffer.toString("base64"),
        mimeType: fetched.mime,
        sizeBytes: fetched.sizeBytes,
      });
    }
  }

  return {
    kind: "sync",
    status: "success",
    images: collected,
    droppedParams: filtered.dropped,
  };
}
