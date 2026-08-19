import type { SyncImageEndpoint } from "@/lib/ai/image/dispatch";
import { getImageModels } from "@/server/models/pricing/pricing.service";
import { uid } from "@/lib/utils/base";
import type { ImageSubmitBody } from "@/lib/validation/image";
import { submitSyncImage } from "./sync-image";
import type { InlayImage } from "@/lib/ai/chat/pipeline/deps";

export async function generateInlayImage(
  apiKey: string,
  prompt: string,
  opts?: { model?: string; references?: { url: string }[] },
): Promise<InlayImage | null> {
  // Already scoped to image models the gateway can submit synchronously, and
  // ordered newest first, so the fallbacks below pick a current model.
  const models = await getImageModels();
  const model =
    (opts?.model
      ? models.find((m) => m.model_name === opts.model)
      : undefined) ??
    models.find((m) => m.is_free) ??
    models[0];
  if (!model) return null;
  const endpoint = model.metadata?.imageParams?.endpoint as
    SyncImageEndpoint | undefined;
  if (!endpoint) return null;
  const images = await submitSyncImage({
    apiKey,
    body: {
      model: model.model_name,
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
