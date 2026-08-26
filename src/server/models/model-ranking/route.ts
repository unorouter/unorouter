import { modelRankingQuery } from "@/lib/api/typebox/model-ranking";
import { unwrap } from "@/lib/utils/base";
import { getModelRanking } from "@/openapi";
import { Elysia } from "elysia";

export const modelRankingRoute = new Elysia({ prefix: "/model-ranking" }).get(
  "/",
  async ({ query }) => {
    const res = await getModelRanking({
      model: query.model,
      period: query.period ?? "week",
    });
    return unwrap(res).data;
  },
  { query: modelRankingQuery },
);
