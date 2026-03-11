import { getLogsSelfStat, getUserLogs } from "@/openapi";
import { Elysia, t } from "elysia";
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
    {
      query: t.Object({
        p: t.Optional(t.String()),
        page_size: t.Optional(t.String()),
        type: t.Optional(t.String()),
        start_timestamp: t.Optional(t.String()),
        end_timestamp: t.Optional(t.String()),
        token_name: t.Optional(t.String()),
        model_name: t.Optional(t.String()),
        group: t.Optional(t.String()),
        request_id: t.Optional(t.String()),
      }),
    },
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
    {
      query: t.Object({
        type: t.Optional(t.String()),
        start_timestamp: t.Optional(t.String()),
        end_timestamp: t.Optional(t.String()),
        token_name: t.Optional(t.String()),
        model_name: t.Optional(t.String()),
      }),
    },
  );
