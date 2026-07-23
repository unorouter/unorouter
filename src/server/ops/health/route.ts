import { getDb } from "@/lib/db/server/client";
import { upstreamApiUrl } from "@/server/constants";
import { sql } from "drizzle-orm";
import { Elysia } from "elysia";

export const healthRoute = new Elysia({ prefix: "/health" }).get(
  "/",
  async () => {
    const checks: Record<string, "ok" | "fail"> = {};

    try {
      await getDb().run(sql`SELECT 1`);
      checks.db = "ok";
    } catch {
      checks.db = "fail";
    }

    try {
      const res = await fetch(`${upstreamApiUrl}/api/status`, {
        signal: AbortSignal.timeout(5_000),
      });
      checks.upstream = res.ok ? "ok" : "fail";
    } catch {
      checks.upstream = "fail";
    }

    const healthy = Object.values(checks).every((v) => v === "ok");

    return {
      status: healthy ? "healthy" : "degraded",
      checks,
      upstreamUrl: upstreamApiUrl,
      uptime: process.uptime(),
      version: process.env.NEXT_PUBLIC_RELEASE_VERSION ?? "dev",
    };
  },
);
