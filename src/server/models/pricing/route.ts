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

  // The /models browse and /compare pages: the catalog row plus the blurb and
  // the metadata they filter on. Carries no group maps; the detail sheet fetches
  // the selected model's groups from /model-groups.
  .get("/browse", async () => {
    const catalog = await getCatalog(true);
    return {
      models: catalog.data.map((m) => ({
        name: m.model_name,
        // Object rather than a bare string: 48 call sites across 21 components
        // read vendor.name/vendor.icon, and renaming them all buys nothing a
        // reader would notice.
        vendor: { id: m.vendor_id, name: m.vendor, icon: m.icon },
        type: m.type,
        tags: m.tags,
        isFree: m.is_free,
        online: m.online,
        chat: m.chat,
        description: m.description,
        inputPrice: m.input_price,
        outputPrice: m.output_price,
        fixedPrice: m.fixed_price,
        isFixedPrice: m.is_fixed_price,
        originalInputPrice: m.original_input_price ?? null,
        originalOutputPrice: m.original_output_price ?? null,
        originalFixedPrice: m.original_fixed_price ?? null,
        metadata: m.metadata,
      })),
      vendorNames: [...new Set(catalog.data.map((m) => m.vendor))].sort(
        (a, b) => a.localeCompare(b),
      ),
    };
  })

  .get("/catalog", async () => {
    const catalog = await getCatalog();
    const models = catalog.data.map((m) => ({
      name: m.model_name,
      vendor: m.vendor,
      isFree: m.is_free,
      tags: m.tags,
      type: m.type,
      releaseTs: m.release_ts,
    }));
    return { models, firstFreeModel: newestFreeChatModel(catalog.data) };
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
