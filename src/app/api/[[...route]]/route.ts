import { APP_VALUES } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import { uid } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import { affiliateRoute } from "@/server/affiliate/route";
import { authRoute } from "@/server/auth/route";
import { badgeRoute } from "@/server/badge/route";
import { billingRoute } from "@/server/billing/route";
import { chatRoute } from "@/server/chat/route";
import { rpRoute } from "@/server/chat/rp/route";
import { syncRoute } from "@/server/chat/sync.route";
import { generationRoute } from "@/server/generation/route";
import { checkoutSessionsRoute } from "@/server/checkout-sessions/route";
import { dashboardRoute } from "@/server/dashboard/route";
import { healthRoute } from "@/server/health/route";
import { logsRoute } from "@/server/logs/route";
import { modelStatusRoute } from "@/server/model-status/route";
import { perfMetricsRoute } from "@/server/perf-metrics/route";
import { pricingRoute } from "@/server/pricing/route";
import { rankingsRoute } from "@/server/rankings/route";
import { settingsRoute } from "@/server/settings/route";
import { statsRoute } from "@/server/stats/route";
import { tokenRoute } from "@/server/token/route";
import { webBotAuthPlugin } from "@/server/web-bot-auth/middleware";
import { fromTypes, openapi } from "@elysiajs/openapi";
import { AdditionalReferences } from "@elysiajs/openapi/types";
import { Elysia } from "elysia";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const openapiRefs =
  process.env.NODE_ENV === "production"
    ? (() => {
        try {
          const path = join(
            process.cwd(),
            ".next/.openapi-types/references.json",
          );
          return JSON.parse(readFileSync(path, "utf8"));
        } catch {
          return {};
        }
      })()
    : fromTypes("src/app/api/[[...route]]/route.ts");

const siteOrigin = new URL(env.appUrl).origin;

export const app = new Elysia({ prefix: "/api" })
  .use(
    openapi({
      path: "/openapi",
      references: openapiRefs as AdditionalReferences,
      documentation: {
        openapi: "3.1.0",
        info: {
          title: `${APP_VALUES.appName} BFF`,
          version: "1.0.0",
          description: `Backend-for-frontend for ${APP_VALUES.appName}. Pass-through verticals (auth, billing, token, affiliate, logs, pricing, dashboard, stats, settings, badge) proxy the upstream relay. The chat vertical owns local state and streaming logic.`,
          contact: {
            name: APP_VALUES.appName,
            url: siteOrigin,
            email: APP_VALUES.supportEmail,
          },
        },
        servers: [{ url: `${siteOrigin}/api` }],
        // MPP (Machine Payment Protocol) service metadata, paymentauth.org
        // draft-payment-discovery-00. Agents read this alongside the
        // per-operation x-payment-info annotations on /billing/*-pay routes
        // to learn what the API does and which operations require payment.
        ...{
          "x-service-info": {
            categories: ["ai", "developer-tools"],
            docs: {
              apiReference: `${siteOrigin}/api/openapi`,
              homepage: siteOrigin,
              llms: `${siteOrigin}/llms.txt`,
            },
          },
        },
      },
    }),
  )
  .derive(({ request }) => {
    const requestId = request.headers.get("x-request-id") ?? uid(12);
    return { requestId, startedAt: performance.now() };
  })
  .onAfterHandle(({ request, requestId, startedAt, set }) => {
    const path = new URL(request.url).pathname;
    const duration = Math.round(performance.now() - startedAt);
    if (path !== "/api/health") {
      logger.info("Request completed", {
        context: "elysia",
        requestId,
        method: request.method,
        path,
        status: set.status ?? 200,
        durationMs: duration,
      });
    }
  })
  .onError(({ error, set, request, requestId }) => {
    const path = new URL(request.url).pathname;
    const err = error as { status?: number; data?: unknown };

    if (err.status && typeof err.status === "number" && err.data) {
      logger.warn("Request failed", {
        context: "elysia",
        requestId,
        status: err.status,
        path,
      });
      set.status = err.status;
      const data = err.data;
      return typeof data === "string" ? data : JSON.stringify(data);
    }

    if (error instanceof Error) {
      logger.error("Unhandled error", {
        context: "elysia",
        requestId,
        message: error.message,
        stack: error.stack,
        path,
      });
      set.status = 400;
      return JSON.stringify({ message: error.message });
    }

    logger.error("Unknown error shape", {
      context: "elysia",
      requestId,
      error: String(error),
      path,
    });
    set.status = 500;
    return JSON.stringify({ message: "Internal server error" });
  })
  .use(webBotAuthPlugin)
  .use(badgeRoute)
  .use(healthRoute)
  .use(pricingRoute)
  .use(perfMetricsRoute)
  .use(modelStatusRoute)
  .use(statsRoute)
  .use(rankingsRoute)
  .use(authRoute)
  .use(billingRoute)
  .use(checkoutSessionsRoute)
  .use(chatRoute)
  .use(rpRoute)
  .use(syncRoute)
  .use(generationRoute)
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
