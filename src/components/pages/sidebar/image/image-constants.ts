import { MAX_IMAGES_PER_GEN, type ImageModelId } from "@/lib/validation/image";
import { rec } from "@/lib/utils/base";

export const INITIAL_MODEL: ImageModelId = "pony";

// The passthrough model: it carries no checkpoint of its own, the AIR rides on the request.
export const CUSTOM_CIVITAI_MODEL_ID = "custom-civitai";
export const VARIANT_CHOICES = [1, 2, MAX_IMAGES_PER_GEN] as const;
export type VariantChoice = (typeof VARIANT_CHOICES)[number];

export function clampVariants(value: unknown): VariantChoice {
  return VARIANT_CHOICES.find((v) => v === value) ?? 1;
}

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

// Face detectors only: the backend's hand/person detectors return no detections.
export const YOLO_MODELS: ReadonlyArray<{ id: string; label: string }> = [
  { id: "bbox/face_yolov8s.pt", label: "face_yolov8s.pt" },
  { id: "bbox/face_yolov9c.pt", label: "face_yolov9c.pt" },
  { id: "bbox/face_yolov8m.pt", label: "face_yolov8m.pt" },
  { id: "bbox/face_yolov8n.pt", label: "face_yolov8n.pt" },
  { id: "bbox/face_yolov8n_v2.pt", label: "face_yolov8n_v2.pt" },
  { id: "mediapipe_face_full", label: "mediapipe_face_full" },
];

// History label: passthrough snapshots store the routing id; the checkpoint's own name
// rides in extraParams.
export function snapshotModelLabel(
  model: string,
  extraParams: unknown,
): string {
  if (model !== CUSTOM_CIVITAI_MODEL_ID) return model;
  const extras = rec(extraParams);
  return typeof extras?.airName === "string" && extras.airName
    ? extras.airName
    : model;
}
