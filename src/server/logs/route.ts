import { logsQuery, logsStatQuery } from "@/lib/typebox/logs";
import { getLogsSelfStat, getUserLogs } from "@/openapi";
import { Elysia } from "elysia";
import { deriveUpstream } from "../constants";

export const logsRoute = new Elysia({ prefix: "/logs" })
  .derive(deriveUpstream)

  .get(
    "/",
    async ({ query, upstream }) => {
      const res = await getUserLogs(
        {
          p: query.p ? Number(query.p) : undefined,
          page_size: query.page_size ? Number(query.page_size) : undefined,
          type: query.type ? Number(query.type) : undefined,
          start_timestamp: query.start_timestamp
            ? Number(query.start_timestamp)
            : undefined,
          end_timestamp: query.end_timestamp
            ? Number(query.end_timestamp)
            : undefined,
          token_name: query.token_name || undefined,
          model_name: query.model_name || undefined,
          group: query.group || undefined,
          request_id: query.request_id || undefined,
        },
        { headers: upstream.headers },
      );
      return res.data!;
    },
    { query: logsQuery },
  )

  .get(
    "/stat",
    async ({ query, upstream }) => {
      const res = await getLogsSelfStat(
        {
          type: query.type ? Number(query.type) : undefined,
          start_timestamp: query.start_timestamp
            ? Number(query.start_timestamp)
            : undefined,
          end_timestamp: query.end_timestamp
            ? Number(query.end_timestamp)
            : undefined,
          token_name: query.token_name || undefined,
          model_name: query.model_name || undefined,
        },
        { headers: upstream.headers },
      );
      return res.data!;
    },
    { query: logsStatQuery },
  );
