import { APP_VALUES } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import { aiDomainRoute } from "@/server/ai/route";
import { authDomainRoute } from "@/server/auth/route";
import { webBotAuthPlugin } from "@/server/auth/web-bot-auth/route";
import { billingDomainRoute } from "@/server/billing/route";
import { modelsDomainRoute } from "@/server/models/route";
import { opsDomainRoute } from "@/server/ops/route";
import { fromTypes, openapi } from "@elysiajs/openapi";
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

export const app = new Elysia({ prefix: "/api" })
  .use(
    openapi({
      path: "/openapi",
      references: openapiRefs,
      documentation: {
        openapi: "3.1.0",
        info: {
          title: `${APP_VALUES.appName} BFF`,
          version: "1.0.0",
          description: `Backend-for-frontend for ${APP_VALUES.appName}. Pass-through verticals (auth, billing, token, affiliate, logs, pricing, dashboard, stats, settings, badge) proxy the upstream relay. The chat vertical owns local state and streaming logic.`,
          contact: {
            name: APP_VALUES.appName,
            url: env.siteOrigin,
            email: APP_VALUES.supportEmail,
          },
        },
        servers: [{ url: `${env.siteOrigin}/api` }],
        ...{
          "x-service-info": {
            categories: ["ai", "developer-tools"],
            docs: {
              apiReference: `${env.siteOrigin}/api/openapi`,
              homepage: env.siteOrigin,
              llms: `${env.siteOrigin}/llms.txt`,
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
