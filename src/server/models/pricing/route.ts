import { buildPricingSummary } from "@/lib/api/pricing";
import { processPlans } from "@/lib/api/subscription";
import { PUBLIC_CACHE } from "@/lib/config/constants";
import { unwrap } from "@/lib/utils/base";
import { getPricing, getSubscriptionPlans } from "@/openapi";
import { ADMIN_HEADERS } from "@/server/constants";
import { snapshotModelCatalog } from "@/server/models/pricing/model-catalog.service";
import { Elysia } from "elysia";

export const pricingRoute = new Elysia({ prefix: "/pricing" })
  .get("/", async () => {
    // ADMIN_HEADERS so customFetch skips the per-user cookie: the Data Cache keys by URL, so the request must be user-independent.
    const res = await getPricing({ headers: ADMIN_HEADERS });
    const summary = buildPricingSummary(unwrap(res));
    snapshotModelCatalog(summary.models);
    return summary;
  })
  .get("/subscriptions", async () => {
    const res = await getSubscriptionPlans({
      headers: ADMIN_HEADERS,
      ...PUBLIC_CACHE,
    });
    if (res.status !== 200) return [];
    return processPlans(res.data.data);
  });
