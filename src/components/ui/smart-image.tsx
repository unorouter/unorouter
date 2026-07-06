import { env } from "@/lib/config/env";
import Image, { type ImageProps } from "next/image";

function isOptimizable(src: string): boolean {
  if (src.startsWith("data:") || src.startsWith("blob:")) return false;
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
  // eslint-disable-next-line jsx-a11y/alt-text
  return <Image {...props} unoptimized={!optimizable} />;
}
