import { env } from "@/lib/config/env";
import Image, { type ImageProps } from "next/image";

/**
 * Wraps next/image for runtime-variable srcs (chat/playground media). The image
 * optimizer only accepts http(s) URLs on an allowlisted host; data:/blob: URIs
 * and non-allowlisted hosts must bypass it or the request 400s. SmartImage
 * decides per-src: R2 + same-origin/relative paths get optimized, everything
 * else falls back to `unoptimized` (rendered as-is, no optimizer round-trip).
 *
 * Callers that size via CSS (object-cover/contain in a sized parent) pass
 * `fill`; callers with intrinsic dimensions pass width/height like next/image.
 */
function isOptimizable(src: string): boolean {
  if (src.startsWith("data:") || src.startsWith("blob:")) return false;
  // Relative path (same-origin, e.g. /api/ops/badge) is always optimizable.
  if (src.startsWith("/")) return true;
  if (!src.startsWith("http")) return false;
  try {
    const host = new URL(src).host;
    const r2Host = env.r2PublicUrl ? new URL(env.r2PublicUrl).host : "";
    if (r2Host && host === r2Host) return true;
    if (host === new URL(env.appUrl).host) return true;
    return false;
  } catch {
    return false;
  }
}

type SmartImageProps = Omit<ImageProps, "src"> & { src: string };

export function SmartImage(props: SmartImageProps) {
  const optimizable = isOptimizable(props.src);
  // alt is required by the SmartImageProps type and forwarded via spread.
  // eslint-disable-next-line jsx-a11y/alt-text
  return <Image {...props} unoptimized={!optimizable} />;
}
