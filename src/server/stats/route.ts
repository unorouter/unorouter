import { newApiGet } from "@/lib/api/client";
import type { LiveStatRaw, QuotaData } from "@/lib/api/types";
import { Elysia } from "elysia";

const ADMIN_HEADERS = {
  Authorization: process.env.SYSTEM_ACCESS_TOKEN,
  "New-Api-User": "1"
};

const FAR_FUTURE = 4102444800; // 2100-01-01

export const statsRoute = new Elysia({ prefix: "/stats" })
  .get("/live", async () => {
    const res = await newApiGet<LiveStatRaw>("/api/log/stat", {
      headers: ADMIN_HEADERS
    });

    return {
      quota: res.data.quota,
      rpm: res.data.rpm,
      tpm: res.data.tpm
    };
  })
  .get("/history", async () => {
    const now = Math.floor(Date.now() / 1000);

    const res = await newApiGet<QuotaData[]>(
      `/api/data/?start_timestamp=0&end_timestamp=${FAR_FUTURE}`,
      { headers: ADMIN_HEADERS }
    );

    const requestCount = res.data.reduce((s, d) => s + d.count, 0);
    const tokenUsed = res.data.reduce((s, d) => s + d.token_used, 0);

    // Avg TPM: total tokens / time span from first data point to now
    let avgTpm = 0;
    if (res.data.length > 0) {
      const earliest = Math.min(...res.data.map((d) => d.created_at));
      const timeDiffMinutes = (now - earliest) / 60;
      if (timeDiffMinutes > 0) {
        avgTpm = Math.round(tokenUsed / timeDiffMinutes);
      }
    }

    return {
      avgTpm,
      requestCount,
      tokenUsed
    };
  });
