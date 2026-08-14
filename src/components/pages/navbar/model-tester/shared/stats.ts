// Pass rate across a provider's models is weighted by sample count: a model
// with 500 probes must not count the same as one with 3.
export function weightedPassRate(
  rows: readonly { avgPassRate: number; sampleCount: number }[],
): number {
  const total = rows.reduce((s, r) => s + r.sampleCount, 0);
  if (total <= 0) return 0;
  return rows.reduce((s, r) => s + r.avgPassRate * r.sampleCount, 0) / total;
}

export function totalSamples(rows: readonly { sampleCount: number }[]): number {
  return rows.reduce((s, r) => s + r.sampleCount, 0);
}
