import { authRoute } from "@/server/auth/route";
import { dashboardRoute } from "@/server/dashboard/route";
import { pricingRoute } from "@/server/pricing/route";
import { statsRoute } from "@/server/stats/route";
import { webhookRoute } from "@/server/webhook/route";
import { Elysia } from "elysia";

export const app = new Elysia({ prefix: "/api" })
  .onError(({ error, set }) => {
    const err = error as { status?: number; data?: unknown };
    if (err.status && typeof err.status === "number") {
      set.status = err.status;
      const data = err.data;
      return typeof data === "string" ? data : JSON.stringify(data);
    }
  })
  .use(pricingRoute)
  .use(statsRoute)
  .use(authRoute)
  .use(dashboardRoute)
  .use(webhookRoute);

export type App = typeof app;

export const GET = app.handle;
export const POST = app.handle;
export const PUT = app.handle;
export const PATCH = app.handle;
export const DELETE = app.handle;
