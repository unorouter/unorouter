import { affiliateRoute } from "@/server/affiliate/route";
import { authRoute } from "@/server/auth/route";
import { billingRoute } from "@/server/billing/route";
import { chatRoute } from "@/server/chat/route";
import { dashboardRoute } from "@/server/dashboard/route";
import { logsRoute } from "@/server/logs/route";
import { pricingRoute } from "@/server/pricing/route";
import { healthRoute } from "@/server/health/route";
import { settingsRoute } from "@/server/settings/route";
import { statsRoute } from "@/server/stats/route";
import { tokenRoute } from "@/server/token/route";
import { logger } from "@/lib/utils/logger";
import { Elysia } from "elysia";

export const app = new Elysia({ prefix: "/api" })

  .onError(({ error, set, request }) => {
    const path = new URL(request.url).pathname;
    const err = error as { status?: number; data?: unknown };

    if (err.status && typeof err.status === "number" && err.data) {
      logger.warn("Request failed", { context: "elysia", status: err.status, path });
      set.status = err.status;
      const data = err.data;
      return typeof data === "string" ? data : JSON.stringify(data);
    }

    if (error instanceof Error) {
      logger.error("Unhandled error", {
        context: "elysia",
        message: error.message,
        stack: error.stack,
        path,
      });
      set.status = 400;
      return JSON.stringify({ message: error.message });
    }

    logger.error("Unknown error shape", { context: "elysia", error: String(error), path });
    set.status = 500;
    return JSON.stringify({ message: "Internal server error" });
  })
  .use(healthRoute)
  .use(pricingRoute)
  .use(statsRoute)
  .use(authRoute)
  .use(billingRoute)
  .use(chatRoute)
  .use(dashboardRoute)
  .use(tokenRoute)
  .use(affiliateRoute)
  .use(logsRoute)
  .use(settingsRoute);

export type App = typeof app;

export const GET = app.handle;
export const POST = app.handle;
export const PUT = app.handle;
export const PATCH = app.handle;
export const DELETE = app.handle;
