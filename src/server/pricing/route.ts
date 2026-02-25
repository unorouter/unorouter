import { processModels, type PricingResponse, type ProcessedModel } from "@/lib/api/pricing";
import { Elysia } from "elysia";

const NEW_API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://api.unorouter.ai";

export const pricingRoute = new Elysia({ prefix: "/pricing" }).get(
  "/",
  async ({ status }): Promise<ProcessedModel[]> => {
    const res = await fetch(`${NEW_API_BASE}/api/pricing`, {
      next: { revalidate: 300 },
    } as RequestInit & { next: { revalidate: number } });

    if (!res.ok) return status(res.status as 500, await res.text()) as never;

    const json = (await res.json()) as PricingResponse;
    return processModels(json);
  }
);
