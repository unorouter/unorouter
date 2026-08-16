import { getEffectiveImageModels } from "@/lib/ai/image/models-dynamic";
import {
  isChatModel,
  newestFreeChatModel,
  toLeanPricing,
} from "@/lib/api/pricing";
import {
  getCatalog,
  getModelByName,
  getModelGroups,
  getPricingSummary,
  getSubscriptionPlansSummary,
  getVendorModels,
} from "@/server/models/pricing/pricing.service";
import { Elysia, t } from "elysia";

export const pricingRoute = new Elysia({ prefix: "/pricing" })
  .get("/", async () => toLeanPricing(await getPricingSummary()))

  .get("/counts", async () => {
    const { models } = await getPricingSummary();
    const freeCount = models.filter((m) => m.isFree).length;
    return {
      modelCount: models.length,
      freeCount,
      paidCount: models.length - freeCount,
      vendorCount: new Set(models.map((m) => m.vendor.name)).size,
    };
  })

  .get("/vendors", async () => {
    const { models } = await getPricingSummary();
    return {
      vendorNames: [...new Set(models.map((m) => m.vendor.name))].sort((a, b) =>
        a.localeCompare(b),
      ),
      modelVendors: models.map((m) => ({
        name: m.name,
        vendor: m.vendor.name,
        chat: isChatModel(m),
        isFree: !!m.isFree,
        tag: m.tags[0] ?? "Other",
        releaseTs: m.metadata.releaseTs,
      })),
    };
  })

  // Upstream wraps the catalog in {success, data}, which is exactly the shape
  // handleElysia treats as a typed-failure envelope: it would unwrap to `data`
  // and drop vendors and first_free_model on the way. Renaming the row list is
  // what keeps the sibling fields reachable; the rows themselves pass through
  // untouched.
  .get("/browse", async () => {
    const catalog = await getCatalog(true);
    return {
      models: catalog.data,
      vendors: catalog.vendors,
      firstFreeModel: catalog.first_free_model ?? null,
    };
  })

  .get("/catalog", async () => {
    const catalog = await getCatalog();
    return {
      models: catalog.data,
      vendors: catalog.vendors,
      firstFreeModel: catalog.first_free_model ?? null,
    };
  })

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
