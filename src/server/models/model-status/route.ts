import {
  modelStatusPageCompactQuery,
  modelStatusPageQuery,
} from "@/lib/api/typebox/model-status";
import { unwrap } from "@/lib/utils/base";
import {
  getModelStatusComponents,
  getModelStatusPage,
} from "@/openapi";
import { Elysia } from "elysia";
import { ADMIN_HEADERS, upstreamApiUrl } from "@/server/constants";

export const modelStatusRoute = new Elysia({ prefix: "/model-status" })
  .get(
    "/page",
    async ({ query }) => {
      const res = await getModelStatusPage(query, { headers: ADMIN_HEADERS });
      return unwrap(res).data;
    },
    { query: modelStatusPageQuery },
  )
  .get(
    "/page_compact",
    async ({ query }) => {
      const params = new URLSearchParams();
      if (query.bucket) params.set("bucket", query.bucket);
      if (query.hours != null) params.set("hours", String(query.hours));
      const url = `${upstreamApiUrl}/api/model_status/page_compact?${params.toString()}`;
      const res = await fetch(url, { headers: ADMIN_HEADERS });
      const body = (await res.json()) as { data: unknown };
      return body.data;
    },
    { query: modelStatusPageCompactQuery },
  )
  .get("/components", async () => {
    const res = await getModelStatusComponents({ headers: ADMIN_HEADERS });
    return unwrap(res).data;
  });
