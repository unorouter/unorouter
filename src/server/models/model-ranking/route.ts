import { modelRankingQuery } from "@/lib/api/typebox/model-ranking";
import type { ModelRankingResponse } from "@/lib/api/typebox/model-ranking";
import { unwrap } from "@/lib/utils/base";
import { getModelRanking } from "@/openapi";
import { ADMIN_HEADERS } from "@/server/constants";
import { Elysia } from "elysia";

export const modelRankingRoute = new Elysia({ prefix: "/model-ranking" }).get(
  "/",
  async ({ query }) => {
    const res = await getModelRanking(
      { model: query.model, period: query.period ?? "week" },
      { headers: ADMIN_HEADERS },
    );
    return unwrap(res).data as ModelRankingResponse;
  },
  { query: modelRankingQuery },
);
