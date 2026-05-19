import { quotaQuery } from "@/lib/api/typebox/dashboard";
import { unwrap } from "@/lib/utils/base";
import { getUptimeKumaStatus, getUserQuotaDates } from "@/openapi";
import { Elysia } from "elysia";
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
  .get("/uptime", async () => {
    const res = await getUptimeKumaStatus();
    return unwrap(res);
  });
