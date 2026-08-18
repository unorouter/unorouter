import { getEffectiveImageModels } from "@/lib/ai/image/models-dynamic";
import { unwrap } from "@/lib/utils/base";
import {
  getPricingCatalog,
  getPricingCounts,
  getPricingVendors,
} from "@/openapi";
import { ADMIN_HEADERS } from "@/server/constants";
import {
  getCatalog,
  getModelByName,
  getModelGroups,
  getSubscriptionPlansSummary,
} from "@/server/models/pricing/pricing.service";
import { Elysia, t } from "elysia";

export const pricingRoute = new Elysia({ prefix: "/pricing" })
  .get("/counts", async () =>
    unwrap(await getPricingCounts({ headers: ADMIN_HEADERS })),
  )

  .get("/vendors", async () =>
    unwrap(await getPricingVendors({ headers: ADMIN_HEADERS })),
  )

  .get("/browse", async () => getCatalog(true))

  .get("/catalog", async () => getCatalog())

  .get("/image-models", async () =>
    getEffectiveImageModels((await getCatalog(true)).models),
  )

  // Upstream matches the vendor by slug or exact name, filters and sorts (newest
  // first, name as tiebreak) and implies `full`, so the vendor page gets its
  // dozen rows instead of all 341.
  .get(
    "/vendor",
    async (ctx) =>
      unwrap(
        await getPricingCatalog(
          { vendor: ctx.query.name },
          { headers: ADMIN_HEADERS },
        ),
      ).models,
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

  .get("/model-groups", async (ctx) => getModelGroups(ctx.query.model), {
    query: t.Object({ model: t.String() }),
  })

  .get("/subscriptions", async () => getSubscriptionPlansSummary());
