import { buildBody, extractResults, loadRefs } from "@/lib/ai/image/dispatch";
import { getModelByName } from "@/server/models/pricing/pricing.service";
import { MAX_INLAY_REFS } from "@/lib/ai/image/constants";
import { type SyncImageEndpoint } from "@/lib/ai/image/dispatch";
import type { GeneratedImage, ImageSubmitBody } from "@/lib/validation/image";
import { logger } from "@/lib/utils/logger";
import { groupHeader } from "@/server/constants";
import {
  batchPlan,
  collectImages,
  formatSize,
  postImageRequest,
  sizeOf,
} from "@/server/ai/image/upstream";

// Sync image generation for the chat inlay/illustrator.
export async function submitSyncImage(args: {
  apiKey: string;
  body: ImageSubmitBody;
  endpoint: SyncImageEndpoint;
  n: number;
  group?: string | null;
}): Promise<GeneratedImage[]> {
  const params = args.body.params ?? {};
  const size = formatSize(sizeOf(args.body.params));

  const meta = await getModelByName(args.body.model);
  // Runware publishes the real limit per model; the fallback only covers a model
  // whose schema we could not resolve.
  const cap = meta?.metadata?.imageParams?.maxReferenceImages || MAX_INLAY_REFS;
  const refUrls = (args.body.references ?? []).slice(0, cap).map((r) => r.url);
  // loadRefs, not a plain fetch: illustrator references are data URIs.
  const refs = refUrls.length > 0 ? await loadRefs(refUrls) : [];

  const plan = batchPlan(args.endpoint === "image-generation", args.n);

  const collected: GeneratedImage[] = [];
  for (let i = 0; i < plan.calls; i++) {
    const built = buildBody(args.endpoint, {
      model: args.body.model,
      prompt: args.body.prompt,
      size,
      refs,
      n: plan.perCallN,
      quality: params.quality,
      outputFormat: params.outputFormat,
      background: params.background,
      strength: params.strength,
      seed: params.seed,
    });

    const res = await postImageRequest(
      built,
      args.apiKey,
      groupHeader(args.group),
    );
    if (res.requestId) {
      // Nothing enriches inlay cost yet; keep the id traceable in logs.
      logger.info("inlay image generated", {
        context: "chat.inlay",
        model: args.body.model,
        requestId: res.requestId,
      });
    }
    const results = extractResults(args.endpoint, res.payload);
    if (results.length === 0) {
      throw new Error(`no image in upstream response (${args.endpoint})`);
    }
    collected.push(...(await collectImages(results, args.apiKey)));
  }

  return collected;
}
