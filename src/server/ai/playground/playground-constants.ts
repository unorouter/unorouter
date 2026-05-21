// Each fresh snapshot extends expiresAt; actively-used sessions never expire.
export const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

// ComfyUI templates live behind new-api's task adapter (channel type 59).
export const COMFYUI_TEMPLATE_IDS = new Set([
  "pony",
  "endgame",
  "comfyui-sdxl-txt2img-lora",
  "flux2-dev",
  "flux2-dev-compose",
]);
