import { unwrap } from "@/lib/utils/base";
import {
  getPricingCatalog,
  getPricingCounts,
  getPricingModelGroups,
  getPricingVendors,
} from "@/openapi";
import {
  getCatalog,
  getImageModels,
  getModelByName,
  getSubscriptionPlansSummary,
} from "@/server/models/pricing/pricing.service";
import { Elysia, t } from "elysia";

export const pricingRoute = new Elysia({ prefix: "/pricing" })
  .get("/counts", async () => unwrap(await getPricingCounts()))

  .get("/vendors", async () => unwrap(await getPricingVendors()))

  .get("/browse", async () => getCatalog(true))

  .get("/catalog", async () => getCatalog())

  .get("/image-models", async () => getImageModels())

  .get(
    "/vendor",
    async (ctx) =>
      unwrap(await getPricingCatalog({ vendor: ctx.query.name })).models,
    { query: t.Object({ name: t.String() }) },
  )

  .get(
    "/detail",
    async (ctx) => {
      const model = await getModelByName(ctx.query.model);
      if (!model) ctx.set.status = 404;
      return model;
    },
    { query: t.Object({ model: t.String() }) },
  )

  .get(
    "/model-groups",
    async (ctx) =>
      unwrap(await getPricingModelGroups({ model: ctx.query.model })),
    { query: t.Object({ model: t.String() }) },
  )

  .get("/subscriptions", async () => getSubscriptionPlansSummary());
