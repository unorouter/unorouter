import { logger } from "@/lib/utils/logger";
import type { AdetailerParams, LoraEntry } from "@/lib/validation/playground";
import { serverEnv } from "@/server/env";

const RUNWARE_ENDPOINT = "https://api.runware.ai/v1";

// ADetailer is two steps, not one parameter: a detector finds faces or hands and returns a
// mask, then a normal inpaint pass redraws only that region at the model's full resolution.
// The provider exposes both halves but nothing that chains them, so the chaining lives here.
//
// The detector is addressed by AIR (`runware:35@<n>`), NOT by the `face_yolov8n.pt` filenames
// the A1111 extension uses. Those names are what users recognise, so the picker keeps them
// and this map translates.
// FACE ONLY, deliberately. Every entry here was verified against a live detection; the hand
// and person slots in this AIR family either error or return no detections even on an image
// that is nothing but hands, so offering them would be a control that silently does nothing.
const DETECTOR_AIR: Record<string, string> = {
  "bbox/face_yolov8n.pt": "runware:35@1",
  "bbox/face_yolov8n_v2.pt": "runware:35@2",
  "bbox/face_yolov8s.pt": "runware:35@3",
  "bbox/face_yolov8m.pt": "runware:35@4",
  "bbox/face_yolov9c.pt": "runware:35@5",
  mediapipe_face_full: "runware:35@6",
};

export function detectorAirFor(yoloModel: string | undefined): string | null {
  if (!yoloModel) return null;
  return DETECTOR_AIR[yoloModel] ?? null;
}

// The pass goes DIRECT to the provider, so it needs the checkpoint the provider knows. For a
// passthrough model that is the resolved AIR the user picked, not our routing placeholder.
export function adetailerCheckpoint(
  body: { model: string; extraParams?: Record<string, unknown> },
  params: Record<string, unknown>,
): string {
  const air = body.extraParams?.air ?? params.air;
  return typeof air === "string" && air ? air : body.model;
}

type MaskResult = { maskImageURL: string; detections: unknown[] };

async function runwareTask<T>(
  task: Record<string, unknown>,
  timeoutMs = 60_000,
): Promise<{ data?: T[]; errors?: { code?: string; message?: string }[] }> {
  const key = serverEnv.runwareApiKey;
  if (!key) throw new Error("runware api key is not configured");
  const res = await fetch(RUNWARE_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([{ taskUUID: crypto.randomUUID(), ...task }]),
    signal: AbortSignal.timeout(timeoutMs),
  });
  return (await res.json()) as {
    data?: T[];
    errors?: { code?: string; message?: string }[];
  };
}

/**
 * Runs one ADetailer pass over a finished image and returns the redrawn image URL, or null
 * when there is nothing to do.
 *
 * Best-effort by design: the source image is already generated and paid for, so a detector
 * that finds no face, or an inpaint that errors, must leave the original untouched rather
 * than failing the whole generation.
 */
export async function runAdetailerPass(args: {
  imageUrl: string;
  adetailer: AdetailerParams;
  checkpoint: string;
  prompt: string;
  negativePrompt?: string;
  loras: LoraEntry[];
  scheduler?: string;
  cfg?: number;
  /** The pass renders at the SOURCE size; the provider requires both explicitly. */
  width: number;
  height: number;
}): Promise<string | null> {
  const air = detectorAirFor(args.adetailer.yoloModel);
  if (!air) return null;

  const mask = await runwareTask<MaskResult>({
    taskType: "imageMasking",
    model: air,
    confidence: args.adetailer.confidence ?? 0.5,
    maskPadding: 18,
    maskBlur: args.adetailer.maskBlur ?? 4,
    inputs: { image: args.imageUrl },
  });

  if (mask.errors?.length) {
    logger.warn("adetailer detection failed", {
      context: "image.adetailer",
      detector: args.adetailer.yoloModel,
      error: mask.errors[0]?.message,
    });
    return null;
  }

  const first = mask.data?.[0];
  // No detections is the normal case for an image with no face in it, not a failure.
  if (!first?.maskImageURL || !first.detections?.length) {
    logger.info("adetailer found nothing to fix", {
      context: "image.adetailer",
      detector: args.adetailer.yoloModel,
    });
    return null;
  }

  // The pass redraws ONLY the masked region, so its prompt is the detail prompt when the
  // user gave one and the original otherwise: an empty prompt would redraw a face from
  // nothing. Steps of 0 means "inherit", which the form spells as the toggle being off.
  const steps = args.adetailer.steps;
  const inpaint = await runwareTask<{ imageURL?: string }>({
    taskType: "imageInference",
    model: args.checkpoint,
    positivePrompt: args.adetailer.prompt?.trim() || args.prompt,
    ...(args.adetailer.negativePrompt?.trim() || args.negativePrompt
      ? {
          negativePrompt:
            args.adetailer.negativePrompt?.trim() || args.negativePrompt,
        }
      : {}),
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
  });

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
