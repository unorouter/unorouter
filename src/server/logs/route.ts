import { logsQuery, logsStatQuery } from "@/lib/typebox/logs";
import { getLogsSelfStat, getUserLogs } from "@/openapi";
import { Elysia } from "elysia";
import { deriveUpstream } from "../constants";

export const logsRoute = new Elysia({ prefix: "/logs" })
  .derive(deriveUpstream)

  .get(
    "/",
    async ({ query, upstream }) => {
      const res = await getUserLogs(query, { headers: upstream.headers });
      return res.data!;
    },
    { query: logsQuery },
  )

  .get(
    "/stat",
    async ({ query, upstream }) => {
      const res = await getLogsSelfStat(query, { headers: upstream.headers });
      return res.data!;
    },
    { query: logsStatQuery },
  );
