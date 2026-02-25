import { Elysia } from "elysia";

const NEW_API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://api.unorouter.ai";
const ADMIN_TOKEN = process.env.SYSTEM_ACCESS_TOKEN!;

export type StatData = {
  quota: number;
  rpm: number;
  tpm: number;
};

export const statsRoute = new Elysia({ prefix: "/stats" }).get(
  "/tokens",
  async ({ status }) => {
    const res = await fetch(`${NEW_API_BASE}/api/log/stat`, {
      headers: { Authorization: ADMIN_TOKEN, "New-Api-User": "1" },
      next: { revalidate: 60 },
    } as RequestInit & { next: { revalidate: number } });

    if (!res.ok) return status(res.status as 500, await res.text());

    const json = (await res.json()) as { success: boolean; data: StatData };
    if (!json.success) return status(500, "new-api returned success=false");

    return json.data;
  }
);
