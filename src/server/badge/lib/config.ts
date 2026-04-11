import type { BadgeSize } from "@/lib/validation/badge";

export interface BadgeDimsBase {
  W: number;
  H: number;
  pad: number;
}

/** Look up dims for requested size, fall back to `md` if not defined */
export function resolveDims<T extends BadgeDimsBase>(
  configs: Partial<Record<BadgeSize, T>>,
  size: BadgeSize,
): T {
  return configs[size] ?? configs.md!;
}
