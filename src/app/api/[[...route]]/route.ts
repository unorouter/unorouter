import { APP_VALUES } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import { aiDomainRoute } from "@/server/ai/route";
import { authDomainRoute } from "@/server/auth/route";
import { webBotAuthPlugin } from "@/server/auth/web-bot-auth/route";
import { billingDomainRoute } from "@/server/billing/route";
import { modelsDomainRoute } from "@/server/models/route";
import { opsDomainRoute } from "@/server/ops/route";
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
  .use(webBotAuthPlugin)
  .use(aiDomainRoute)
  .use(authDomainRoute)
  .use(billingDomainRoute)
  .use(modelsDomainRoute)
  .use(opsDomainRoute);

export type App = typeof app;

export const GET = app.handle;
export const POST = app.handle;
export const PUT = app.handle;
export const PATCH = app.handle;
export const DELETE = app.handle;
