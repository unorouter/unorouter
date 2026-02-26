import { NewApiError, newApiGet } from "@/lib/api/client";
import { processModels, type PricingResponse } from "@/lib/api/pricing";
import { Elysia } from "elysia";

export const pricingRoute = new Elysia({ prefix: "/pricing" }).get(
  "/",
  async ({ status }) => {
    const json = await newApiGet<PricingResponse>("/api/pricing").catch(
      (e: NewApiError) => status(e.status as 500, e.message) as never
    );
    const models = processModels(json);

    return {
      modelCount: models.length,
      vendorCount: new Set(models.map((m) => m.vendor.name)).size,
      models: models.map((m) => ({ name: m.name, vendor: m.vendor.name }))
    };
  }
);
