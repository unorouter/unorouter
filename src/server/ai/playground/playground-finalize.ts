import type { PlaygroundSubmitBody } from "@/lib/validation/playground";
export type { GeneratedImage } from "@/lib/validation/playground";

export function paramsToSize(
  params: PlaygroundSubmitBody["params"],
): string | undefined {
  const p = params ?? {};
  return p.width && p.height ? `${p.width}x${p.height}` : undefined;
}
