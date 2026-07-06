import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";

export type LivePricing = Awaited<ReturnType<typeof fetchLivePricing>>;

/** Live pricing catalog for server components; null on upstream failure so callers can fall back. */
export function fetchLivePricing(opts?: { includeOffline?: boolean }) {
  const call = opts?.includeOffline
    ? rpc.api.models.pricing.get({ query: { include_offline: "true" } })
    : rpc.api.models.pricing.get();
  return call.then(handleElysia).catch(() => null);
}
