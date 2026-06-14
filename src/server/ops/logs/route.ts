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
  getAllLogs,
  getLogsSelfStat,
  getUserLogs,
  getUserMidjourney,
  getUserTask,
} from "@/openapi";
import { ADMIN_HEADERS, deriveUpstream } from "@/server/constants";
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

      // Authoritative upstream record for one already-owned request_id (real quota, tokens, channel, latency) the BFF can only estimate at stream time. Uses getAllLogs (the admin path) since getUserLogs blanks channel_name; ADMIN_HEADERS authorizes it, pinned to the caller's own request_id so no other user's data leaks.
  .get(
    "/by-request",
    async ({ query }) => {
      // All-null default straight from the response schema (single source).
      const empty = Value.Create(byRequestResponse);
      const res = await getAllLogs(
        { request_id: query.request_id, page_size: 1 },
        { headers: ADMIN_HEADERS },
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
