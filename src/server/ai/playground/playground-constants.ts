export { RETENTION_MS } from "@/lib/config/constants";

// ComfyUI templates live behind new-api's task adapter (channel type 59).
export const COMFYUI_TEMPLATE_IDS = new Set([
  "pony",
  "endgame",
  "comfyui-sdxl-txt2img-lora",
  "flux2-dev",
  "flux2-dev-compose",
]);

// Aligned with the form variant buttons (1/2/4) and the validator's `n` bound.
export const MAX_IMAGES_PER_GEN = 4;
