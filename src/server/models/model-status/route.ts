import {
  modelStatusBucketsQuery,
  modelStatusPageCompactQuery,
} from "@/lib/api/typebox/model-status";
import type { CompactPagePayload } from "@/lib/api/model-status-decode";
import { unwrap } from "@/lib/utils/base";
import {
  getModelStatusBuckets,
  getModelStatusComponents,
  getModelStatusPageCompact,
} from "@/openapi";
import { Elysia } from "elysia";
import { ADMIN_HEADERS } from "@/server/constants";

export const modelStatusRoute = new Elysia({ prefix: "/model-status" })
  .get(
    "/page_compact",
    async ({ query }) => {
      const res = await getModelStatusPageCompact(query, {
        headers: ADMIN_HEADERS,
      });
      return unwrap(res).data as CompactPagePayload;
    },
    { query: modelStatusPageCompactQuery },
  )
  .get(
    "/buckets",
    async ({ query }) => {
      const res = await getModelStatusBuckets(query, {
        headers: ADMIN_HEADERS,
      });
      return unwrap(res).data;
    },
    { query: modelStatusBucketsQuery },
  )
  .get("/components", async () => {
    const res = await getModelStatusComponents({
      headers: ADMIN_HEADERS,
    });
    return unwrap(res).data;
  });
