import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";

export type LivePricing = Awaited<ReturnType<typeof fetchLivePricing>>;

/** Live pricing catalog for server components; null on upstream failure so callers can fall back. */
export function fetchLivePricing() {
  return rpc.api.models.pricing
    .get()
    .then(handleElysia)
    .catch(() => null);
}
