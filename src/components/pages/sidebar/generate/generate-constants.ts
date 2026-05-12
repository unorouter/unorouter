import type { ControlNetValue } from "./fields/controlnet-modal";
import type { GenerationModel } from "@/lib/validation/generation";

export const INITIAL_MODEL: GenerationModel = "pony";
export const VARIANT_CHOICES = [1, 2, 4] as const;

export const CLIP_TOKEN_CAP = 77;

export const UPSCALER_MULTIPLIERS: ReadonlyArray<{
  id: string;
  value: number | null;
}> = [
  { id: "1x", value: 1 },
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

export const YOLO_MODELS: ReadonlyArray<{ id: string; label: string }> = [
  { id: "bbox/face_yolov8s.pt", label: "face_yolov8s.pt" },
  { id: "bbox/face_yolov9c.pt", label: "face_yolov9c.pt" },
  { id: "bbox/face_yolov8m.pt", label: "face_yolov8m.pt" },
  { id: "bbox/face_yolov8n.pt", label: "face_yolov8n.pt" },
  { id: "bbox/face_yolov8n_v2.pt", label: "face_yolov8n_v2.pt" },
  { id: "bbox/hand_yolov8s.pt", label: "hand_yolov8s.pt" },
  { id: "bbox/hand_yolov9c.pt", label: "hand_yolov9c.pt" },
  { id: "bbox/hand_yolov8n.pt", label: "hand_yolov8n.pt" },
  { id: "segm/person_yolov8n-seg.pt", label: "person_yolov8n-seg.pt" },
  { id: "segm/person_yolov8m-seg.pt", label: "person_yolov8m-seg.pt" },
  { id: "segm/person_yolov8s-seg.pt", label: "person_yolov8s-seg.pt" },
  { id: "mediapipe_face_full", label: "mediapipe_face_full" },
  { id: "mediapipe_face_mesh", label: "mediapipe_face_mesh" },
  { id: "mediapipe_face_short", label: "mediapipe_face_short" },
];

export const CONTROLNET_KINDS: ReadonlyArray<{
  id: ControlNetValue["kind"];
  i18nKey: string;
}> = [
  { id: "depth", i18nKey: "IMAGE.CONTROLNET_DEPTH" },
  { id: "canny", i18nKey: "IMAGE.CONTROLNET_CANNY" },
  { id: "openpose", i18nKey: "IMAGE.CONTROLNET_OPENPOSE" },
];
