import { chooseEndpoint } from "@/lib/ai/playground/models-dynamic";
import { getPricingSummary } from "@/lib/api/pricing-cache";
import { uid } from "@/lib/utils/base";
import type { PlaygroundSubmitBody } from "@/lib/validation/playground";
import { submitSyncImage } from "@/server/ai/playground/playground-submit-sync";
import type { InlayImage } from "@/lib/ai/chat/pipeline/deps";

export async function generateInlayImage(
  apiKey: string,
  prompt: string,
  opts?: { model?: string; references?: { url: string }[] },
): Promise<InlayImage | null> {
  const summary = await getPricingSummary();
  const model =
    (opts?.model
      ? summary.models.find((m) => m.type === "image" && m.name === opts.model)
      : undefined) ??
    summary.models.find((m) => m.type === "image" && m.isFree) ??
    summary.models.find((m) => m.type === "image");
  if (!model) return null;
  const endpoint = chooseEndpoint(model.endpointTypes ?? []);
  if (!endpoint) return null;
  const images = await submitSyncImage({
    apiKey,
    body: {
      model: model.name,
      prompt,
      references: opts?.references,
    } as PlaygroundSubmitBody,
    endpoint,
    n: 1,
  });
  const img = images[0];
  if (!img) return null;
  return {
    id: uid(),
    dataBase64: img.base64,
    mimeType: img.mimeType,
    sizeBytes: img.sizeBytes,
  };
}
