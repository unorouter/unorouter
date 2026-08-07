import {
  flowQuery,
  flowRow,
  quotaQuery,
  type FlowRow,
} from "@/lib/api/typebox/dashboard";
import { customFetch } from "@/lib/custom-fetch";
import { unwrap } from "@/lib/utils/base";
import { getUserQuotaDates } from "@/openapi";
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
      // Hand-rolled instead of an Orval client: /api/data/flow/self postdates the
      // last `bun openapi` run. Swap to the generated fn once it regenerates.
      const params = new URLSearchParams({
        start_timestamp: String(query.start_timestamp),
        end_timestamp: String(query.end_timestamp),
      });
      const res = await customFetch<{
        data: {
          success: boolean;
          message: string;
          data?: FlowRow[] | null;
        };
        status: number;
      }>(`/api/data/flow/self?${params}`, {
        method: "GET",
        headers: upstream.headers,
      });
      const body = unwrap(res);
      if (!body.success) throw new Error(body.message);
      return body.data ?? [];
    },
    { query: flowQuery, response: t.Array(flowRow) },
  );
