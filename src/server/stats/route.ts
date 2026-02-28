import { NewApiError, newApiGet } from "@/lib/api/client";
import type { LiveStatRaw, NewApiResponse, QuotaData } from "@/lib/api/types";
import { Elysia } from "elysia";

const ADMIN_HEADERS = {
  Authorization: process.env.SYSTEM_ACCESS_TOKEN,
  "New-Api-User": "1"
};

const FAR_FUTURE = 4102444800; // 2100-01-01

export const statsRoute = new Elysia({ prefix: "/stats" })
  .get("/live", async ({ status }) => {
    const json = await newApiGet<NewApiResponse<LiveStatRaw>>("/api/log/stat", {
      headers: ADMIN_HEADERS
    }).catch((e: NewApiError) => status(e.status as 500, e.message) as never);

    if (!json.success) return status(500, "new-api returned success=false");

    return {
      quota: json.data.quota,
      rpm: json.data.rpm,
      tpm: json.data.tpm
    };
  })
  .get("/history", async ({ status }) => {
    const now = Math.floor(Date.now() / 1000);

    const json = await newApiGet<NewApiResponse<QuotaData[]>>(
      `/api/data/?start_timestamp=0&end_timestamp=${FAR_FUTURE}`,
      { headers: ADMIN_HEADERS }
    ).catch((e: NewApiError) => status(e.status as 500, e.message) as never);

    if (!json.success) return status(500, "new-api returned success=false");

    const requestCount = json.data.reduce((s, d) => s + d.count, 0);
    const tokenUsed = json.data.reduce((s, d) => s + d.token_used, 0);

    // Avg TPM: total tokens / time span from first data point to now
    let avgTpm = 0;
    if (json.data.length > 0) {
      const earliest = Math.min(...json.data.map((d) => d.created_at));
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
