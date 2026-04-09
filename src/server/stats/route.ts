import { getAllQuotaDates, getLogsStat } from "@/openapi";
import { unwrap } from "@/lib/utils/base";
import { Elysia } from "elysia";
import { ADMIN_HEADERS } from "../constants";
import { FAR_FUTURE } from "@/lib/config/constants";

export const statsRoute = new Elysia({ prefix: "/stats" })
  .get("/live", async () => {
    const res = await getLogsStat(undefined, {
      headers: ADMIN_HEADERS,
    });
    const stat = unwrap(res).data;

    return {
      quota: stat?.quota ?? 0,
      rpm: stat?.rpm ?? 0,
      tpm: stat?.tpm ?? 0,
    };
  })
  .get("/history", async () => {
    const now = Math.floor(Date.now() / 1000);

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
  });
