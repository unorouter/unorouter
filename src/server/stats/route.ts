import { newApiGet } from "@/lib/api/client";
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
    const res = await newApiGet("/api/log/stat", {
      headers: { Authorization: ADMIN_TOKEN, "New-Api-User": "1" }
    });

    if (!res.ok) return status(res.status as 500, await res.text());

    const json = (await res.json()) as { success: boolean; data: StatData };
    if (!json.success) return status(500, "new-api returned success=false");

    return json.data;
  }
);
