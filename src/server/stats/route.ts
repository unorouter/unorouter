import { NewApiError, newApiGet } from "@/lib/api/client";
import { Elysia } from "elysia";

const ADMIN_TOKEN = process.env.SYSTEM_ACCESS_TOKEN!;

type QuotaData = {
  count: number;
  quota: number;
  token_used: number;
};

export type StatData = {
  quota: number;
  rpm: number;
  tpm: number;
  requestCount: number;
  tokenUsed: number;
};

const FAR_FUTURE = 4102444800; // 2100-01-01

export const statsRoute = new Elysia({ prefix: "/stats" }).get(
  "/tokens",
  async ({ status }) => {
    const headers = { Authorization: ADMIN_TOKEN, "New-Api-User": "1" };

    const [liveJson, historyJson] = await Promise.all([
      newApiGet<{ success: boolean; data: { quota: number; rpm: number; tpm: number } }>(
        "/api/log/stat",
        { headers }
      ).catch((e: NewApiError) => status(e.status as 500, e.message) as never),
      newApiGet<{ success: boolean; data: QuotaData[] }>(
        `/api/data/?start_timestamp=0&end_timestamp=${FAR_FUTURE}`,
        { headers }
      ).catch((e: NewApiError) => status(e.status as 500, e.message) as never),
    ]);

    if (!liveJson.success || !historyJson.success)
      return status(500, "new-api returned success=false");

    const requestCount = historyJson.data.reduce((s, d) => s + d.count, 0);
    const tokenUsed = historyJson.data.reduce((s, d) => s + d.token_used, 0);

    return {
      quota: liveJson.data.quota,
      rpm: liveJson.data.rpm,
      tpm: liveJson.data.tpm,
      requestCount,
      tokenUsed,
    } satisfies StatData;
  }
);
