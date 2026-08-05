import {
  MAX_IMAGES_PER_GEN,
  type PlaygroundModel,
} from "@/lib/validation/playground";

export const INITIAL_MODEL: PlaygroundModel = "pony";

// The passthrough model: it carries no checkpoint of its own, the AIR rides on the request.
export const CUSTOM_CIVITAI_MODEL_ID = "custom-civitai";
export const VARIANT_CHOICES = [1, 2, MAX_IMAGES_PER_GEN] as const;

export const CLIP_TOKEN_CAP = 77;

export const PLAYGROUND_SESSION_TITLE_MAX = 60;

export const UPSCALER_MULTIPLIERS: ReadonlyArray<{
  id: string;
  value: number | null;
}> = [
  // No 1x entry: a multiplier of 1 IS "off", and that is the header switch's job.
  { id: "1.5x", value: 1.5 },
  { id: "2x", value: 2 },
  { id: "3x", value: 3 },
  { id: "4x", value: 4 },
  { id: "custom", value: null },
];

export const VAES: ReadonlyArray<{ value: string; label: string }> = [
  { value: "automatic", label: "Automatic" },
  { value: "none", label: "None" },
  {
    value: "vae-ft-mse-840000-ema-pruned.ckpt",
    label: "vae-ft-mse-840000-ema-pruned.ckpt",
  },
  { value: "kl-f8-anime.ckpt", label: "kl-f8-anime.ckpt" },
  { value: "kl-f8-anime2.ckpt", label: "kl-f8-anime2.ckpt" },
  { value: "YOZORA.vae.pt", label: "YOZORA.vae.pt" },
  { value: "orangemix.vae.pt", label: "orangemix.vae.pt" },
  { value: "blessed2.vae.pt", label: "blessed2.vae.pt" },
  { value: "animevae.pt", label: "animevae.pt" },
  { value: "ClearVAE.safetensors", label: "ClearVAE.safetensors" },
];

// Face detectors only: the backend's hand and person detectors return nothing even on an
// image that is entirely hands, so listing them would offer a control that does not work.
export const YOLO_MODELS: ReadonlyArray<{ id: string; label: string }> = [
  { id: "bbox/face_yolov8s.pt", label: "face_yolov8s.pt" },
  { id: "bbox/face_yolov9c.pt", label: "face_yolov9c.pt" },
  { id: "bbox/face_yolov8m.pt", label: "face_yolov8m.pt" },
  { id: "bbox/face_yolov8n.pt", label: "face_yolov8n.pt" },
  { id: "bbox/face_yolov8n_v2.pt", label: "face_yolov8n_v2.pt" },
  { id: "mediapipe_face_full", label: "mediapipe_face_full" },
];

/**
 * What to call a snapshot's model in history.
 *
 * A user-supplied checkpoint routes through one passthrough model id, so the stored model
 * name is the routing id for every one of them. The checkpoint's own name is kept in
 * extraParams at submit time; fall back to the model id when it is absent, which covers
 * curated models and snapshots made before the name was recorded.
 */
export function snapshotModelLabel(
  model: string,
  extraParams: unknown,
): string {
  if (model !== CUSTOM_CIVITAI_MODEL_ID) return model;
  const extras = extraParams as { airName?: unknown } | null | undefined;
  return typeof extras?.airName === "string" && extras.airName
    ? extras.airName
    : model;
}
