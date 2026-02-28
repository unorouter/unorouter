import { newApiGet } from "@/lib/api/client";
import { processModels, type PricingResponse } from "@/lib/api/pricing";
import { Elysia } from "elysia";

export const pricingRoute = new Elysia({ prefix: "/pricing" }).get(
  "/",
  async () => {
    const json = await newApiGet<PricingResponse>("/api/pricing");
    const models = processModels(json);

    return {
      modelCount: models.length,
      vendorCount: new Set(models.map((m) => m.vendor.name)).size,
      models,
    };
  }
);
