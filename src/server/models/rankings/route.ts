import { rankingsQuery } from "@/lib/api/typebox/rankings";
import { unwrap } from "@/lib/utils/base";
import { getRankings } from "@/openapi";
import { Elysia } from "elysia";

export const rankingsRoute = new Elysia({ prefix: "/rankings" }).get(
  "/",
  async ({ query }) => {
    const res = await getRankings({ period: query.period ?? "week" });
    return unwrap(res).data;
  },
  { query: rankingsQuery },
);
