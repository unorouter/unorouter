import {
  byRequestQuery,
  byRequestResponse,
  logsQuery,
  logsStatQuery,
} from "@/lib/api/typebox/logs";
import { midjourneyLogsQuery } from "@/lib/api/typebox/midjourney";
import { taskLogsQuery } from "@/lib/api/typebox/task";
import { unwrap } from "@/lib/utils/base";
import {
  getLogsSelfStat,
  getUserLogs,
  getUserMidjourney,
  getUserTask,
} from "@/openapi";
import { deriveUpstream } from "@/server/constants";
import { Value } from "@sinclair/typebox/value";
import { Elysia } from "elysia";

export const logsRoute = new Elysia({ prefix: "/logs" })
  .derive(deriveUpstream)

  .get(
    "/",
    async ({ query, upstream }) => {
      const res = await getUserLogs(query, { headers: upstream.headers });
      return unwrap(res);
    },
    { query: logsQuery },
  )

  .get(
    "/by-request",
    async ({ query, upstream }) => {
      const empty = Value.Create(byRequestResponse);
      // Scoped to the caller's own token (getUserLogs), NOT ADMIN_HEADERS: the
      // enrich lookup only needs the requester's own row, and the admin path
      // let anyone poll request ids off error responses to map other users'
      // channels/usage AND pinned a BFF worker on a slow admin query per call.
      const res = await getUserLogs(
        { request_id: query.request_id, page_size: 1 },
        { headers: upstream.headers },
      );
      const row = unwrap(res)?.data?.items?.[0] ?? undefined;
      if (!row) return empty;
      return {
        channel: row.channel_name?.trim() || null,
        quota: row.quota ?? null,
        promptTokens: row.prompt_tokens ?? null,
        completionTokens: row.completion_tokens ?? null,
        useTime: row.use_time ?? null,
        modelName: row.model_name ?? null,
        group: row.group ?? null,
      };
    },
    { query: byRequestQuery, response: byRequestResponse },
  )

  .get(
    "/stat",
    async ({ query, upstream }) => {
      const res = await getLogsSelfStat(query, { headers: upstream.headers });
      return unwrap(res);
    },
    { query: logsStatQuery },
  )

  .get(
    "/midjourney",
    async ({ query, upstream }) => {
      const res = await getUserMidjourney(query, {
        headers: upstream.headers,
      });
      return unwrap(res);
    },
    { query: midjourneyLogsQuery },
  )

  .get(
    "/task",
    async ({ query, upstream }) => {
      const res = await getUserTask(query, { headers: upstream.headers });
      return unwrap(res);
    },
    { query: taskLogsQuery },
  );
