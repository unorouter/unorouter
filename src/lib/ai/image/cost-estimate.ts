// Measured live: cost tracks megapixels, NOT steps, and the same request varies up to
// 5.9x with GPU wall-clock. A fitted formula mispredicted Flux by 200%, hence a typical
// price per megapixel plus an exact ceiling from the gateway's clamp.

// Must mirror the adaptor's clamp (new-api relay/channel/runware/types.go).
export const CLAMP_MAX_PIXELS = 1024 * 1024;
export const CLAMP_MAX_STEPS = 50;

const MEGAPIXEL = 1024 * 1024;

// Typical observed upstream cost for a 1MP image; stable across SDXL, SD1.5, Pony, Flux.
const TYPICAL_COST_PER_MEGAPIXEL = 0.0013;

// Worst single-image cost seen across ~60 probes at the clamped size (~1 in 10 calls).
const WORST_COST_PER_MEGAPIXEL = 0.0092;

export type CostEstimateInput = {
  width: number;
  height: number;
  count: number;
  /** Multiplier the gateway applies to the provider's reported cost. */
  markup: number;
  /** Per-call price the gateway falls back to when the marked-up cost is below it. */
  floorPrice: number;
};

export type CostEstimate = {
  /** Expected charge in USD. Typical, not guaranteed: the upstream price is not deterministic. */
  estimate: number;
  /** Charge ceiling in USD. Exact, since the gateway clamps every request before it runs. */
  max: number;
  /** True when the request exceeds the clamp and will be scaled down before it runs. */
  clamped: boolean;
};

export function estimateImageCost(input: CostEstimateInput): CostEstimate {
  const count = Math.max(1, input.count);
  const requestedPixels = Math.max(1, input.width * input.height);
  const billedPixels = Math.min(requestedPixels, CLAMP_MAX_PIXELS);

  const price = (upstreamPerMegapixel: number, pixels: number) =>
    Math.max(
      upstreamPerMegapixel * (pixels / MEGAPIXEL) * input.markup,
      input.floorPrice,
    ) * count;

  return {
    estimate: price(TYPICAL_COST_PER_MEGAPIXEL, billedPixels),
    max: price(WORST_COST_PER_MEGAPIXEL, CLAMP_MAX_PIXELS),
    clamped: requestedPixels > CLAMP_MAX_PIXELS,
  };
}

export function willClamp(width: number, height: number, steps: number) {
  return width * height > CLAMP_MAX_PIXELS || steps > CLAMP_MAX_STEPS;
}
