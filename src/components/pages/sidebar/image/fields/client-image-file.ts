import { base64ToDataUri, uint8ToBase64 } from "@/lib/utils/base";

export const ACCEPTED_IMAGE_MIMES = ["image/png", "image/jpeg", "image/webp"];

/** Providers reject oversized inline payloads, so every data URI gets capped here. */
export const MAX_LONG_EDGE = 1024;

/**
 * Sniffs the container rather than trusting file.type, which is attacker supplied
 * and wrong often enough on real uploads.
 */
export function sniffImageMime(bytes: Uint8Array): string | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("ERRORS.UNEXPECTED_ERROR"));
    img.src = src;
  });
}

/**
 * Reads a picked file entirely in the browser and returns a downscaled data URI.
 * Throws when the bytes are not a supported image.
 */
export async function fileToScaledDataUri(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const mime = sniffImageMime(bytes);
  if (!mime) throw new Error("ERRORS.DISALLOWED_CONTENT_TYPE");

  const original = base64ToDataUri(uint8ToBase64(bytes), mime);
  const img = await loadImage(original);

  const longEdge = Math.max(img.naturalWidth, img.naturalHeight);
  if (longEdge <= MAX_LONG_EDGE) return original;

  const scale = MAX_LONG_EDGE / longEdge;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("ERRORS.UNEXPECTED_ERROR");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // PNG keeps alpha, which layer diffusion and inpaint masks depend on.
  const outMime = mime === "image/png" ? "image/png" : "image/jpeg";
  return canvas.toDataURL(outMime, 0.92);
}
