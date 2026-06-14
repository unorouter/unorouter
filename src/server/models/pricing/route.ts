import { buildPricingSummary } from "@/lib/api/pricing";
import { processPlans } from "@/lib/api/subscription";
import { PUBLIC_CACHE } from "@/lib/config/constants";
import { unwrap } from "@/lib/utils/base";
import { getPricing, getSubscriptionPlans } from "@/openapi";
import { Elysia } from "elysia";
import { ADMIN_HEADERS } from "@/server/constants";

export const pricingRoute = new Elysia({ prefix: "/pricing" })
  .get("/", async () => {
        // ADMIN_HEADERS so customFetch skips the per-user cookie attach: the Data Cache keys by URL only, so the cached request must be user-independent.
    const res = await getPricing({ headers: ADMIN_HEADERS, ...PUBLIC_CACHE });
    return buildPricingSummary(unwrap(res));
  })
  .get("/subscriptions", async () => {
    const res = await getSubscriptionPlans({
      headers: ADMIN_HEADERS,
      ...PUBLIC_CACHE,
    });
    if (res.status !== 200) return [];
    return processPlans(res.data.data);
  });
