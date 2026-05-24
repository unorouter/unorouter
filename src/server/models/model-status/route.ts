import { modelStatusPageQuery } from "@/lib/api/typebox/model-status";
import { unwrap } from "@/lib/utils/base";
import {
  getModelStatusComponents,
  getModelStatusPage,
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
  .get("/components", async () => {
    const res = await getModelStatusComponents({ headers: ADMIN_HEADERS });
    return unwrap(res).data;
  });
