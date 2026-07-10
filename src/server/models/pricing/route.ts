import {
  getPricingSummary,
  getSubscriptionPlansSummary,
} from "@/server/models/pricing/pricing.service";
import { Elysia, t } from "elysia";

export const pricingRoute = new Elysia({ prefix: "/pricing" })
  .get(
    "/",
    async (ctx) => getPricingSummary(ctx.query.include_offline === "true"),
    { query: t.Object({ include_offline: t.Optional(t.String()) }) },
  )
  .get("/subscriptions", async () => getSubscriptionPlansSummary());
