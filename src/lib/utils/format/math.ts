export type StatIntent = "default" | "warning" | "success";

export function successIntent(pct: number): StatIntent {
  if (pct >= 99.9) return "success";
  if (pct >= 99) return "default";
  return "warning";
}
