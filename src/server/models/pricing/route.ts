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
      const includeOffline = ctx.query.include_offline === "true";
      const res = await getPricing(
        includeOffline ? { include_offline: "true" } : undefined,
        { headers: ADMIN_HEADERS },
      );
      const summary = buildPricingSummary(unwrap(res));
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
