import { NewApiError, newApiGet } from "@/lib/api/client";
import { Elysia } from "elysia";

const ADMIN_TOKEN = process.env.SYSTEM_ACCESS_TOKEN!;

export type StatData = {
  quota: number;
  rpm: number;
  tpm: number;
};

export const statsRoute = new Elysia({ prefix: "/stats" }).get(
  "/tokens",
  async ({ status }) => {
    const json = await newApiGet<{ success: boolean; data: StatData }>(
      "/api/log/stat",
      { headers: { Authorization: ADMIN_TOKEN, "New-Api-User": "1" } }
    ).catch((e: NewApiError) => status(e.status as 500, e.message) as never);

    if (!json.success) return status(500, "new-api returned success=false");

    return json.data;
  }
);
