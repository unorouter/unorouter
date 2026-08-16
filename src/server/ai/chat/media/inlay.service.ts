import { chooseEndpoint } from "@/lib/ai/image/models-dynamic";
import { getPricingSummary } from "@/server/models/pricing/pricing.service";
import { uid } from "@/lib/utils/base";
import type { ImageSubmitBody } from "@/lib/validation/image";
import { submitSyncImage } from "./sync-image";
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
    } as ImageSubmitBody,
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
    width: img.width,
    height: img.height,
  };
}
