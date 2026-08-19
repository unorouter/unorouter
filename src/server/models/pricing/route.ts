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

  // Upstream matches the vendor by slug or exact name, filters and sorts (newest
  // first, name as tiebreak) and implies `full`, so the vendor page gets its
  // dozen rows instead of all 341.
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

  // Upstream scopes every field to this model: ~17 group ratios rather than the
  // 1800+ the full map carries, and the auto chain already intersected with the
  // model's groups rather than the 56KB global list.
  .get(
    "/model-groups",
    async (ctx) =>
      unwrap(await getPricingModelGroups({ model: ctx.query.model })),
    { query: t.Object({ model: t.String() }) },
  )

  .get("/subscriptions", async () => getSubscriptionPlansSummary());
