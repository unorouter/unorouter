import {
  byRequestQuery,
  byRequestResponse,
  logsQuery,
  logsStatQuery,
  logsPerfQuery,
} from "@/lib/api/typebox/logs";
import { taskLogsQuery } from "@/lib/api/typebox/task";
import { unwrap } from "@/lib/utils/base";
import {
  getLogByRequest,
  getLogsSelfStat,
  getSelfPerfMetrics,
  getUserLogs,
  getUserTask,
} from "@/openapi";
import { deriveUpstream } from "@/server/constants";
import { Value } from "@sinclair/typebox/value";
import { Elysia } from "elysia";

export const logsRoute = new Elysia({ prefix: "/logs" })
  .derive(deriveUpstream)

  .get(
    "/",
    async ({ query, upstream }) =>
      unwrap(await getUserLogs(query, { headers: upstream.headers })),
    { query: logsQuery },
  )

  .get(
    "/by-request",
    async ({ query, upstream }) => {
      // The gateway answers only the caller's own row, so the session must go along.
      const res = await getLogByRequest(
        { request_id: query.request_id },
        { headers: upstream.headers },
      );
      const row = unwrap(res)?.data;
      if (!row?.model_name) return Value.Create(byRequestResponse);
      return {
        channel: row.channel?.trim() || null,
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
    async ({ query, upstream }) =>
      unwrap(await getLogsSelfStat(query, { headers: upstream.headers })),
    { query: logsStatQuery },
  )

  .get(
    "/perf",
    async ({ query, upstream }) =>
      unwrap(
        await getSelfPerfMetrics(query, {
          headers: upstream.headers,
        }),
      ),
    { query: logsPerfQuery },
  )

  .get(
    "/task",
    async ({ query, upstream }) =>
      unwrap(await getUserTask(query, { headers: upstream.headers })),
    { query: taskLogsQuery },
  );
