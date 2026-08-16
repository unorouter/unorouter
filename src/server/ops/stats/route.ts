import { FAR_FUTURE } from "@/lib/config/constants";
import { unwrap } from "@/lib/utils/base";
import { getQuotaDataSummary } from "@/openapi";
import { ADMIN_HEADERS } from "@/server/constants";
import { Elysia } from "elysia";

// Cached upstream in new-api (Redis, 5min, keyed by window).
export const statsRoute = new Elysia({ prefix: "/stats" }).get(
  "/history",
  async () => {
    const res = await getQuotaDataSummary(
      { start_timestamp: 0, end_timestamp: FAR_FUTURE },
      { headers: ADMIN_HEADERS },
    );
    return unwrap(res).data;
  },
);
