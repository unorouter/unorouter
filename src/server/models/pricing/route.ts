import { buildPricingSummary } from "@/lib/api/pricing";
import { processPlans } from "@/lib/api/subscription";
import { PUBLIC_CACHE } from "@/lib/config/constants";
import { unwrap } from "@/lib/utils/base";
import { getPricing, getSubscriptionPlans } from "@/openapi";
import { ADMIN_HEADERS } from "@/server/constants";
import { snapshotModelCatalog } from "@/server/models/pricing/model-catalog.service";
import { Elysia, t } from "elysia";

export const pricingRoute = new Elysia({ prefix: "/pricing" })
  .get(
    "/",
    async (ctx) => {
      // Offline models (online=false) are opt-in and only consumed server-side by the
      // model-detail page + sitemap; the differing URL keys a separate Data Cache entry.
      const includeOffline = ctx.query.include_offline === "true";
      // ADMIN_HEADERS so customFetch skips the per-user cookie: the Data Cache keys by URL, so the request must be user-independent.
      const res = await getPricing(
        includeOffline ? { include_offline: "true" } : undefined,
        { headers: ADMIN_HEADERS },
      );
      const summary = buildPricingSummary(unwrap(res));
      // Snapshot only the online set so offline models never refresh lastSeenAt (retirement stays correct).
      if (!includeOffline) snapshotModelCatalog(summary.models);
      return summary;
    },
    { query: t.Object({ include_offline: t.Optional(t.String()) }) },
  )
  .get("/subscriptions", async () => {
    const res = await getSubscriptionPlans({
      headers: ADMIN_HEADERS,
      ...PUBLIC_CACHE,
    });
    if (res.status !== 200) return [];
    return processPlans(res.data.data);
  });
