import {
  getModelDetail,
  getPricingCounts,
  getPricingLean,
  getPricingVendors,
  getSubscriptionPlansSummary,
  getVendorModels,
} from "@/server/models/pricing/pricing.service";
import { Elysia, t } from "elysia";

export const pricingRoute = new Elysia({ prefix: "/pricing" })
  .get(
    "/",
    async (ctx) => getPricingLean(ctx.query.include_offline === "true"),
    { query: t.Object({ include_offline: t.Optional(t.String()) }) },
  )
  .get("/counts", async () => getPricingCounts())
  .get("/vendors", async () => getPricingVendors())
  .get("/vendor", async (ctx) => getVendorModels(ctx.query.name), {
    query: t.Object({ name: t.String() }),
  })
  .get("/detail", async (ctx) => getModelDetail(ctx.query.model), {
    query: t.Object({ model: t.String() }),
  })
  .get("/subscriptions", async () => getSubscriptionPlansSummary());
