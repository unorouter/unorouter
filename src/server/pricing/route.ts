import { getApiPricing } from "@/lib/api/generated/api";
import { processModels } from "@/lib/api/pricing";
import { Elysia } from "elysia";

export const pricingRoute = new Elysia({ prefix: "/pricing" }).get(
  "/",
  async () => {
    const res = await getApiPricing();
    const models = processModels(res.data);

    return {
      modelCount: models.length,
      vendorCount: new Set(models.map((m) => m.vendor.name)).size,
      models
    };
  }
);
