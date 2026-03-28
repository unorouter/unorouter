import { quotaQuery } from "@/lib/typebox/dashboard";
import { getUserQuotaDates, getUptimeKumaStatus } from "@/openapi";
import { Elysia } from "elysia";
import { deriveUpstream } from "../constants";

export const dashboardRoute = new Elysia({ prefix: "/dashboard" })
  .derive(deriveUpstream)
  .get(
    "/quota",
    async ({ query, upstream }) => {
      const res = await getUserQuotaDates(query, {
        headers: upstream.headers,
      });
      return res.data!;
    },
    { query: quotaQuery },
  )
  .get("/uptime", async () => {
    const res = await getUptimeKumaStatus();
    return res.data!;
  });
