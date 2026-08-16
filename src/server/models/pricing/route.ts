import { getEffectiveImageModels } from "@/lib/ai/image/models-dynamic";
import {
  isChatModel,
  leanModel,
  toLeanPricing,
  usedGroupRatios,
} from "@/lib/api/pricing";
import {
  getModelByName,
  getPricingCatalogSource,
  getPricingSummary,
  getSubscriptionPlansSummary,
} from "@/server/models/pricing/pricing.service";
import { Elysia, t } from "elysia";

export const pricingRoute = new Elysia({ prefix: "/pricing" })
  .get("/", async () => toLeanPricing(await getPricingSummary()))

  .get("/counts", async () => {
    const { models } = await getPricingCatalogSource();
    const freeCount = models.filter((m) => m.isFree).length;
    return {
      modelCount: models.length,
      freeCount,
      paidCount: models.length - freeCount,
      vendorCount: new Set(models.map((m) => m.vendor.name)).size,
    };
  })

  .get("/vendors", async () => {
    const { models } = await getPricingCatalogSource();
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

  .get("/catalog", async () => {
    const { models, summary } = await getPricingCatalogSource();
    return {
      groupRatioMap: usedGroupRatios(models, summary.groupRatioMap),
      models: models.map((m) => ({
        name: m.name,
        vendor: m.vendor.name,
        isFree: m.isFree,
        tags: m.tags,
        type: m.type,
        enableGroups: m.enableGroups,
        online: m.online,
        releaseTs: m.metadata.releaseTs,
      })),
      firstFreeModel: summary.firstFreeModel?.name ?? null,
    };
  })

  .get("/model-basics", async () => {
    const { models } = await getPricingCatalogSource();
    return {
      models: models.map((m) => ({
        name: m.name,
        vendor: m.vendor.name,
        isFree: m.isFree,
        type: m.type,
      })),
    };
  })

  .get("/text-models", async () => {
    const { models } = await getPricingCatalogSource();
    return {
      models: models
        .filter((m) => m.type === "text")
        .map((m) => ({
          name: m.name,
          isFree: m.isFree,
          vendor: { name: m.vendor.name },
        })),
    };
  })

  .get("/image-models", async () => {
    const { models } = await getPricingCatalogSource();
    return { models: getEffectiveImageModels(models) };
  })

  .get(
    "/vendor",
    async (ctx) => {
      const { models } = await getPricingCatalogSource();
      return {
        models: models
          .filter((m) => m.vendor.name === ctx.query.name)
          .map((m) => leanModel(m)),
      };
    },
    { query: t.Object({ name: t.String() }) },
  )

  .get(
    "/detail",
    async (ctx) => {
      const { byName } = await getPricingCatalogSource();
      return {
        model:
          byName.get(ctx.query.model) ??
          (await getModelByName(ctx.query.model)),
      };
    },
    { query: t.Object({ model: t.String() }) },
  )

  .get("/subscriptions", async () => getSubscriptionPlansSummary());
