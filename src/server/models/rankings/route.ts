import { rankingsQuery } from "@/lib/api/typebox/rankings";
import { unwrap } from "@/lib/utils/base";
import { getRankings } from "@/openapi";
import { ADMIN_HEADERS } from "@/server/constants";
import { Elysia } from "elysia";

export const rankingsRoute = new Elysia({ prefix: "/rankings" }).get(
  "/",
  async ({ query }) => {
    const res = await getRankings(
      { period: query.period ?? "week" },
      { headers: ADMIN_HEADERS },
    );
    return unwrap(res).data;
  },
  { query: rankingsQuery },
);
