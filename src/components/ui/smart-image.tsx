import { env } from "@/lib/config/env";
import Image, { type ImageProps } from "next/image";

// next/image wrapper for runtime-variable srcs: the optimizer 400s on
// data:/blob: and non-allowlisted hosts, so only R2 + same-origin/relative
// paths optimize; everything else renders `unoptimized`.
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
