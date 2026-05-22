import type { PlaygroundSubmitBody } from "@/lib/validation/playground";
import { MAX_IMAGES_PER_GEN } from "./playground-constants";
export type { GeneratedImage } from "@/lib/validation/playground";

export function paramsToSize(
  params: PlaygroundSubmitBody["params"],
): string | undefined {
  const p = params ?? {};
  return p.width && p.height ? `${p.width}x${p.height}` : undefined;
}

export function imageCountFor(body: PlaygroundSubmitBody): number {
  const n = body.params?.n ?? 1;
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(MAX_IMAGES_PER_GEN, Math.floor(n));
}
