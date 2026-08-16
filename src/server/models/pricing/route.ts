import { getEffectiveImageModels } from "@/lib/ai/image/models-dynamic";
import { toLeanPricing } from "@/lib/api/pricing";
import {
  getCatalog,
  getModelByName,
  getModelGroups,
  getPricingSummary,
  getSubscriptionPlansSummary,
  getVendorModels,
  getVendors,
} from "@/server/models/pricing/pricing.service";
import { Elysia, t } from "elysia";

export const pricingRoute = new Elysia({ prefix: "/pricing" })
  .get("/", async () => toLeanPricing(await getPricingSummary()))

  .get("/counts", async () => (await getCatalog()).counts)

  .get("/vendors", async () => getVendors())

  .get("/browse", async () => getCatalog(true))

  .get("/catalog", async () => getCatalog())

  .get("/image-models", async () => {
    const { models } = await getPricingSummary();
    return getEffectiveImageModels(models);
  })

  .get("/vendor", async (ctx) => getVendorModels(ctx.query.name), {
    query: t.Object({ name: t.String() }),
  })

  .get(
    "/detail",
    async (ctx) => {
      const { models } = await getPricingSummary();
      const model =
        models.find((m) => m.name === ctx.query.model) ??
        (await getModelByName(ctx.query.model));
      if (!model) ctx.set.status = 404;
      return model;
    },
    { query: t.Object({ model: t.String() }) },
  )

  .get("/model-groups", async (ctx) => getModelGroups(ctx.query.model), {
    query: t.Object({ model: t.String() }),
  })

  .get("/subscriptions", async () => getSubscriptionPlansSummary());
