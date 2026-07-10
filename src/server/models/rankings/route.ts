import { rankingsQuery } from "@/lib/api/typebox/rankings";
import { fetchRankings } from "@/server/models/rankings/rankings.service";
import { Elysia } from "elysia";

export const rankingsRoute = new Elysia({ prefix: "/rankings" }).get(
  "/",
  async ({ query }) => fetchRankings(query.period ?? "week"),
  { query: rankingsQuery },
);
