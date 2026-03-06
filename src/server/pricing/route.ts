import { buildPricingSummary, processModels } from "@/lib/api/pricing";
import { processPlans } from "@/lib/api/subscription";
import { getPricing, getSubscriptionPlans } from "@/openapi";
import { Elysia } from "elysia";
import { ADMIN_HEADERS } from "../constants";

export const pricingRoute = new Elysia({ prefix: "/pricing" })
  .get("/", async () => {
    const res = await getPricing();
    const models = processModels(res.data!);
    return buildPricingSummary(models);
  })
  .get("/subscriptions", async () => {
    const res = await getSubscriptionPlans({ headers: ADMIN_HEADERS });
    if (res.status !== 200) return [];
    return processPlans(res.data.data);
  });
