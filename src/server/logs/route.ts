import { logsQuery, logsStatQuery } from "@/lib/api/typebox/logs";
import { midjourneyLogsQuery } from "@/lib/api/typebox/midjourney";
import { taskLogsQuery } from "@/lib/api/typebox/task";
import { unwrap } from "@/lib/utils/base";
import {
  getLogsSelfStat,
  getUserLogs,
  getUserMidjourney,
  getUserTask,
} from "@/openapi";
import { Elysia } from "elysia";
import { deriveUpstream } from "../constants";

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
