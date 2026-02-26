import { newApiGet } from "@/lib/api/client";
import { processModels, type PricingResponse } from "@/lib/api/pricing";
import { Elysia } from "elysia";

export const pricingRoute = new Elysia({ prefix: "/pricing" }).get(
  "/",
  async ({ status }) => {
    const res = await newApiGet("/api/pricing");

    if (!res.ok) return status(res.status as 500, await res.text()) as never;

    const json = (await res.json()) as PricingResponse;
    const models = processModels(json);

    return {
      modelCount: models.length,
      vendorCount: new Set(models.map((m) => m.vendor.name)).size,
      models: models.map((m) => ({ name: m.name, vendor: m.vendor.name }))
    };
  }
);
