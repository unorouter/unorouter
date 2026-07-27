import {
  modelStatusBucketsQuery,
  modelStatusPageCompactQuery,
} from "@/lib/api/typebox/model-status";
import type { CompactPagePayload } from "@/lib/api/model-status-compact";
import { unwrap } from "@/lib/utils/base";
import {
  getModelStatusBuckets,
  getModelStatusComponents,
  getModelStatusPageCompact,
} from "@/openapi";
import { Elysia } from "elysia";
import { ADMIN_HEADERS } from "@/server/constants";

// Snapshots refresh once a minute upstream, so a short revalidate collapses
// concurrent public reads onto one aggregation without serving stale bars.
const STATUS_CACHE = { next: { revalidate: 60 } } as const;

export const modelStatusRoute = new Elysia({ prefix: "/model-status" })
  .get(
    "/page_compact",
    async ({ query }) => {
      const res = await getModelStatusPageCompact(query, {
        headers: ADMIN_HEADERS,
        ...STATUS_CACHE,
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
        ...STATUS_CACHE,
      });
      return unwrap(res).data;
    },
    { query: modelStatusBucketsQuery },
  )
  .get("/components", async () => {
    const res = await getModelStatusComponents({
      headers: ADMIN_HEADERS,
      ...STATUS_CACHE,
    });
    return unwrap(res).data;
  });
