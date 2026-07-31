// Price preview for GPU-time-billed image models (Runware).
//
// The gateway bills what the provider reports times a markup, so the exact price exists only
// after the image does. This estimates it for the submit button.
//
// What the pricing actually looks like, measured live rather than assumed:
//
//   - Cost scales with megapixels. 512x512 is reliably cheaper than 2048x2048.
//   - Cost does NOT scale cleanly with steps. Flux at 50 steps came back CHEAPER than the same
//     request at 20 steps.
//   - The same request repeated is not the same price: ten identical Flux calls returned
//     $0.0013 nine times and $0.0077 once, a 5.9x spread, because the real driver is GPU
//     wall-clock (which GPU it lands on, how loaded it is), not the request.
//
// So a fitted cost = f(pixels, steps) formula is not honest here; it was tried and it mispredicted
// Flux by 200%. What IS stable is the typical price per megapixel, so that is what gets quoted,
// with an exact ceiling from the gateway's clamp. Outliers land between the two and are covered
// by the max.

// Must mirror the adaptor's clamp (new-api relay/channel/runware/types.go). If those change
// without this, the quoted max stops being a ceiling.
export const CLAMP_MAX_PIXELS = 1024 * 1024;
export const CLAMP_MAX_STEPS = 50;

const MEGAPIXEL = 1024 * 1024;

// Typical observed upstream cost for a 1MP image, across SDXL, SD1.5, Pony and Flux. All four
// families sit at the same $0.0013 for a standard 1MP generation; they diverge only in how often
// they draw an expensive slot, which no formula can predict.
const TYPICAL_COST_PER_MEGAPIXEL = 0.0013;

// Worst single-image cost seen across ~60 probes at the clamped size. Rare (one call in ten at
// the extreme) and ~7x typical, so it is deliberately NOT shown as a headline "max": quoting it
// would imply a price nobody actually pays. It exists so callers can warn on a large batch,
// where the tail stops being unlikely.
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

/** True when a request will be scaled down or have its steps capped before it runs. */
export function willClamp(width: number, height: number, steps: number) {
  return width * height > CLAMP_MAX_PIXELS || steps > CLAMP_MAX_STEPS;
}
