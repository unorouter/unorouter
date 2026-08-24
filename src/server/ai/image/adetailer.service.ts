import { isValidAir } from "@/lib/ai/image/constants";
import { logger } from "@/lib/utils/logger";
import type { AdetailerParams, LoraEntry } from "@/lib/validation/image";
import { runwareTask } from "./runware";

const ADETAILER_TIMEOUT_MS = 60_000;

// Keyed by the A1111 filenames the picker shows. FACE ONLY: the hand/person slots
// in this AIR family return no detections even on an image of nothing but hands.
const DETECTOR_AIR: Record<string, string> = {
  "bbox/face_yolov8n.pt": "runware:35@1",
  "bbox/face_yolov8n_v2.pt": "runware:35@2",
  "bbox/face_yolov8s.pt": "runware:35@3",
  "bbox/face_yolov8m.pt": "runware:35@4",
  "bbox/face_yolov9c.pt": "runware:35@5",
  mediapipe_face_full: "runware:35@6",
};

function detectorAirFor(yoloModel: string | undefined): string | null {
  if (!yoloModel) return null;
  return DETECTOR_AIR[yoloModel] ?? null;
}

// Goes direct to the provider, so a passthrough model needs the resolved AIR, not
// our routing placeholder.
export function adetailerCheckpoint(body: {
  model: string;
  extraParams?: { air?: string };
}): string {
  const air = body.extraParams?.air;
  return isValidAir(air) ? air : body.model;
}

type MaskResult = { maskImageURL: string; detections: unknown[] };

export async function runAdetailerPass(args: {
  imageUrl: string;
  adetailer: AdetailerParams;
  checkpoint: string;
  prompt: string;
  negativePrompt?: string;
  loras: LoraEntry[];
  scheduler?: string;
  cfg?: number;
  width: number;
  height: number;
}): Promise<string | null> {
  const air = detectorAirFor(args.adetailer.yoloModel);
  if (!air) return null;

  const mask = await runwareTask<MaskResult>(
    {
      taskType: "imageMasking",
      model: air,
      confidence: args.adetailer.confidence ?? 0.5,
      maskPadding: 18,
      maskBlur: args.adetailer.maskBlur ?? 4,
      inputs: { image: args.imageUrl },
    },
    ADETAILER_TIMEOUT_MS,
  );

  if (mask.errors?.length) {
    logger.warn("adetailer detection failed", {
      context: "image.adetailer",
      detector: args.adetailer.yoloModel,
      error: mask.errors[0]?.message,
    });
    return null;
  }

  const first = mask.data?.[0];
  if (!first?.maskImageURL || !first.detections?.length) {
    logger.info("adetailer found nothing to fix", {
      context: "image.adetailer",
      detector: args.adetailer.yoloModel,
    });
    return null;
  }

  // Steps 0 = inherit (the form's toggle-off state).
  const steps = args.adetailer.steps;
  const negativePrompt =
    args.adetailer.negativePrompt?.trim() || args.negativePrompt;
  const inpaint = await runwareTask<{ imageURL?: string }>(
    {
      taskType: "imageInference",
      model: args.checkpoint,
      positivePrompt: args.adetailer.prompt?.trim() || args.prompt,
      ...(negativePrompt ? { negativePrompt } : {}),
      width: args.width,
      height: args.height,
      seedImage: args.imageUrl,
      maskImage: first.maskImageURL,
      strength: args.adetailer.denoise ?? 0.25,
      ...(typeof steps === "number" && steps > 0 ? { steps } : {}),
      ...(args.scheduler ? { scheduler: args.scheduler } : {}),
      ...(typeof args.cfg === "number" ? { CFGScale: args.cfg } : {}),
      ...(args.loras.length
        ? { lora: args.loras.map((l) => ({ model: l.name, weight: l.weight })) }
        : {}),
      numberResults: 1,
    },
    ADETAILER_TIMEOUT_MS,
  );

  if (inpaint.errors?.length) {
    logger.warn("adetailer inpaint failed", {
      context: "image.adetailer",
      error: inpaint.errors[0]?.message,
    });
    return null;
  }

  const url = inpaint.data?.[0]?.imageURL;
  if (!url) return null;
  logger.info("adetailer pass applied", {
    context: "image.adetailer",
    detector: args.adetailer.yoloModel,
    detections: first.detections.length,
  });
  return url;
}
