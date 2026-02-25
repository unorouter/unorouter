import { processModels, type PricingResponse } from "@/lib/api/pricing";
import { Elysia } from "elysia";

const NEW_API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://api.unorouter.ai";

export const pricingRoute = new Elysia({ prefix: "/pricing" }).get(
  "/",
  async ({ status }) => {
    const res = await fetch(`${NEW_API_BASE}/api/pricing`, {
      next: { revalidate: 300 },
    } as RequestInit & { next: { revalidate: number } });

    if (!res.ok) return status(res.status as 500, await res.text()) as never;

    const json = (await res.json()) as PricingResponse;
    const models = processModels(json);

    return {
      modelCount: models.length,
      vendorCount: new Set(models.map((m) => m.vendor.name)).size,
      models: models.map((m) => ({ name: m.name, vendor: m.vendor.name })),
    };
  }
);
