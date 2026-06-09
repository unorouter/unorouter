import { getAllQuotaDates } from "@/openapi";
import { unixSec, unwrap } from "@/lib/utils/base";
import { Elysia } from "elysia";
import { ADMIN_HEADERS } from "@/server/constants";
import { FAR_FUTURE } from "@/lib/config/constants";

export const statsRoute = new Elysia({ prefix: "/stats" }).get(
  "/history",
  async () => {
    const now = unixSec();

    const res = await getAllQuotaDates(
      { start_timestamp: 0, end_timestamp: FAR_FUTURE },
      { headers: ADMIN_HEADERS },
    );
    const body = unwrap(res);
    const data = body.data ?? [];

    const requestCount = data.reduce((s, d) => s + (d?.count ?? 0), 0);
    const tokenUsed = data.reduce((s, d) => s + (d?.token_used ?? 0), 0);

    // Avg TPM: total tokens / time span from first data point to now
    let avgTpm = 0;
    if (data.length > 0) {
      const earliest = Math.min(...data.map((d) => d?.created_at ?? 0));
      const timeDiffMinutes = (now - earliest) / 60;
      if (timeDiffMinutes > 0) {
        avgTpm = Math.round(tokenUsed / timeDiffMinutes);
      }
    }

    return {
      avgTpm,
      requestCount,
      tokenUsed,
    };
  },
);
