import { unwrap } from "@/lib/utils/base";
import {
  getModelStatusBuckets,
  getModelStatusComponents,
  getModelStatusIncidents,
  getModelStatusPage,
} from "@/openapi";
import { Elysia, t } from "elysia";
import { ADMIN_HEADERS } from "../constants";

export const modelStatusRoute = new Elysia({ prefix: "/model-status" })
  .get(
    "/page",
    async ({ query }) => {
      const res = await getModelStatusPage(query, { headers: ADMIN_HEADERS });
      return unwrap(res).data;
    },
    {
      query: t.Object({
        bucket: t.Optional(t.String()),
        hours: t.Optional(t.Numeric()),
      }),
    },
  )
  .get("/components", async () => {
    const res = await getModelStatusComponents({ headers: ADMIN_HEADERS });
    return unwrap(res).data;
  })
  .get(
    "/buckets",
    async ({ query }) => {
      const res = await getModelStatusBuckets(query, {
        headers: ADMIN_HEADERS,
      });
      return unwrap(res).data;
    },
    {
      query: t.Object({
        model: t.String(),
        bucket: t.Optional(t.String()),
        hours: t.Optional(t.Numeric()),
      }),
    },
  )
  .get(
    "/incidents",
    async ({ query }) => {
      const res = await getModelStatusIncidents(query, {
        headers: ADMIN_HEADERS,
      });
      return unwrap(res).data;
    },
    {
      query: t.Object({
        since: t.Optional(t.Numeric()),
        until: t.Optional(t.Numeric()),
        model: t.Optional(t.String()),
      }),
    },
  );
