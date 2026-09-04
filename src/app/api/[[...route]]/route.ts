import { APP_VALUES } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import { aiDomainRoute } from "@/server/ai/route";
import { authDomainRoute } from "@/server/auth/route";
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

const PUBLIC_READ_TTL: { match: (p: string) => boolean; ttl: number }[] = [
  { match: (p) => p.startsWith("/api/models/pricing/"), ttl: 300 },
  { match: (p) => p.startsWith("/api/models/model-status/"), ttl: 45 },
  { match: (p) => p.startsWith("/api/models/perf-metrics"), ttl: 300 },
  { match: (p) => p === "/api/models/rankings", ttl: 300 },
];

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
  // Anonymous public reads that only mirror upstream catalog/status data. Cloudflare
  // caches on CDN-Cache-Control and strips it from the client response, so browsers keep
  // revalidating while a flood of the same URL is absorbed at the edge. Anything carrying
  // a credential is left alone: the header is set only when the request has neither an
  // Authorization header nor a session cookie.
  .onAfterHandle(({ request, path, set }) => {
    const ttl = PUBLIC_READ_TTL.find((e) => e.match(path))?.ttl;
    if (ttl === undefined) return;
    if (request.method !== "GET") return;
    if (request.headers.get("authorization")) return;
    if (request.headers.get("cookie")?.includes("session=")) return;
    set.headers["cdn-cache-control"] =
      `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`;
  })
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
