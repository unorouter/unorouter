import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";

export type LivePricing = Awaited<ReturnType<typeof fetchLivePricing>>;

export function fetchLivePricing(opts?: { includeOffline?: boolean }) {
  const call = opts?.includeOffline
    ? rpc.api.models.pricing.get({ query: { include_offline: "true" } })
    : rpc.api.models.pricing.get();
  return call.then(handleElysia).catch(() => null);
}
