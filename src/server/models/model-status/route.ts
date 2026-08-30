import {
  modelStatusBucketsQuery,
  modelStatusPageCompactQuery,
} from "@/lib/api/typebox/model-status";
import { unwrap } from "@/lib/utils/base";
import {
  getModelStatusBuckets,
  getModelStatusComponents,
  getModelStatusPageCompact,
} from "@/openapi";
import { Elysia } from "elysia";

export const modelStatusRoute = new Elysia({ prefix: "/model-status" })
  .get(
    "/page_compact",
    async ({ query }) => {
      const res = await getModelStatusPageCompact(query);
      return unwrap(res).data;
    },
    { query: modelStatusPageCompactQuery },
  )
  .get(
    "/buckets",
    async ({ query }) => {
      const res = await getModelStatusBuckets(query);
      return unwrap(res).data;
    },
    { query: modelStatusBucketsQuery },
  )
  .get("/components", async () => {
    const res = await getModelStatusComponents();
    return unwrap(res).data;
  });
