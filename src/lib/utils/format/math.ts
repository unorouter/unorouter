export function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export type StatIntent = "default" | "warning" | "success";

/** Map a success-rate percentage to a stat intent (success >= 99.9, default >= 99, else warning). */
export function successIntent(pct: number): StatIntent {
  if (pct >= 99.9) return "success";
  if (pct >= 99) return "default";
  return "warning";
}
