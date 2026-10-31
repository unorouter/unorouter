import { priceHistoryQuery } from "@/lib/api/typebox/price-history";
import { unwrap } from "@/lib/utils/base";
import { getModelPriceHistory, getPriceDrops } from "@/openapi";
import { Elysia } from "elysia";

export const priceHistoryRoute = new Elysia({ prefix: "/price-history" })
  .get(
    "/",
    async ({ query }) => {
      const res = await getModelPriceHistory({ model: query.model });
      return unwrap(res).data;
    },
    { query: priceHistoryQuery },
  )
  .get("/drops", async () => {
    const res = await getPriceDrops();
    return unwrap(res).data;
  });
