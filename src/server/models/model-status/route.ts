import {
  modelStatusPageCompactQuery,
  modelStatusPageQuery,
} from "@/lib/api/typebox/model-status";
import type { CompactPagePayload } from "@/lib/api/model-status-compact";
import { unwrap } from "@/lib/utils/base";
import {
  getModelStatusComponents,
  getModelStatusPage,
  getModelStatusPageCompact,
} from "@/openapi";
import { Elysia } from "elysia";
import { ADMIN_HEADERS } from "@/server/constants";

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
      const res = await getModelStatusPageCompact(query, {
        headers: ADMIN_HEADERS,
      });
      return unwrap(res).data as CompactPagePayload;
    },
    { query: modelStatusPageCompactQuery },
  )
  .get("/components", async () => {
    const res = await getModelStatusComponents({ headers: ADMIN_HEADERS });
    return unwrap(res).data;
  });
