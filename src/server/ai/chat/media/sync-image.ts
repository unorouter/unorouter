import {
  buildBody,
  extractResults,
  loadRefs,
  type SyncImageEndpoint,
} from "@/lib/ai/image/dispatch";
import { isValidAir } from "@/lib/ai/image/constants";
import { rec } from "@/lib/utils/base";
import type { GeneratedImage, ImageSubmitBody } from "@/lib/validation/image";
import { logger } from "@/lib/utils/logger";
import { groupHeader } from "@/server/constants";
import { collectImages, postImageRequest } from "@/server/ai/image/upstream";

// One synchronous image for the chat inlay and illustrator.
export async function submitSyncImage(args: {
  apiKey: string;
  body: ImageSubmitBody;
  endpoint: SyncImageEndpoint;
  group?: string | null;
}): Promise<GeneratedImage[]> {
  const refUrls = (args.body.references ?? []).map((r) => r.url);
  // loadRefs, not a plain fetch: illustrator references are data URIs.
  const refs = refUrls.length > 0 ? await loadRefs(refUrls) : [];
  const air = rec(args.body.extraParams)?.air;
  const negativePrompt = args.body.negativePrompt;
  const diffusion = {
    ...(isValidAir(air) ? { air } : {}),
    ...(negativePrompt ? { negativePrompt } : {}),
  };

  const built = buildBody(args.endpoint, {
    model: args.body.model,
    prompt: args.body.prompt,
    refs,
    n: 1,
    diffusion: Object.keys(diffusion).length > 0 ? diffusion : undefined,
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
  return collectImages(results);
}
