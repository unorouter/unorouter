import { flowQuery, flowRow, quotaQuery } from "@/lib/api/typebox/dashboard";
import { unwrap } from "@/lib/utils/base";
import { getUserFlowQuotaDates, getUserQuotaDates } from "@/openapi";
import { Elysia, t } from "elysia";
import { deriveUpstream } from "@/server/constants";

export const dashboardRoute = new Elysia({ prefix: "/dashboard" })
  .derive(deriveUpstream)
  .get(
    "/quota",
    async ({ query, upstream }) => {
      const res = await getUserQuotaDates(query, {
        headers: upstream.headers,
      });
      return unwrap(res);
    },
    { query: quotaQuery },
  )
  .get(
    "/flow",
    async ({ query, upstream }) => {
      const body = unwrap(await getUserFlowQuotaDates(query, upstream));
      if (!body.success) throw new Error(body.message);
      return body.data ?? [];
    },
    { query: flowQuery, response: t.Array(flowRow) },
  );
