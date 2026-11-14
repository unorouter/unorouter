import { Elysia, t } from "elysia";
import { rateLimit } from "@/server/rate-limit";
import { recordClientReport } from "./client-report.service";

const BOT = /bot|crawl|spider|headless|lighthouse|slurp/i;
export const clientReportRoute = new Elysia({ prefix: "/client-report" }).post(
  "/",
  async ({ body, request, set }) => {
    set.status = 204;
    const h = request.headers;
    const ua = h.get("user-agent") ?? "";
    if (h.get("sec-gpc") === "1" || BOT.test(ua)) return;
    await recordClientReport(body, ua);
  },
  {
    beforeHandle: rateLimit("client-report", 60),
    body: t.Object({
      source: t.String({ maxLength: 100 }),
      name: t.String({ maxLength: 100 }),
      message: t.String({ maxLength: 300 }),
      stack: t.String({ maxLength: 6000 }),
      componentStack: t.Optional(t.String({ maxLength: 2000 })),
      path: t.String({ maxLength: 200, pattern: "^/" }),
      release: t.String({ maxLength: 64 }),
    }),
  },
);
