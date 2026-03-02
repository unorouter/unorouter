import { processModels } from "@/lib/api/pricing";
import { getPricing } from "@/openapi";
import { Elysia } from "elysia";

export const pricingRoute = new Elysia({ prefix: "/pricing" }).get(
  "/",
  async () => {
    const res = await getPricing();
    const models = processModels(res.data!);

    const vendorGroups = new Map<
      string,
      { vendor: (typeof models)[number]["vendor"]; models: typeof models }
    >();
    for (const model of models) {
      const key = model.vendor.name;
      const group = vendorGroups.get(key);
      if (group) {
        group.models.push(model);
      } else {
        vendorGroups.set(key, { vendor: model.vendor, models: [model] });
      }
    }

    const vendors = [...vendorGroups.values()]
      .map((g) => ({
        ...g.vendor,
        modelCount: g.models.length,
        models: g.models
          .sort((a, b) => b.name.localeCompare(a.name))
          .slice(0, 3),
      }))
      .sort((a, b) => b.modelCount - a.modelCount);

    return {
      modelCount: models.length,
      vendorCount: vendors.length,
      models,
      vendors,
    };
  },
);
