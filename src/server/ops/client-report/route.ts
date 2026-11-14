import { Elysia, t } from "elysia";
import { recordClientReport } from "./client-report.service";

const BOT = /bot|crawl|spider|headless|lighthouse|slurp/i;
const LIMIT_PER_MINUTE = 60;
const seen = new Map<string, { count: number; reset: number }>();

// Rate limited per /24 or /48 in memory only: no address is ever written down.
function overLimit(ip: string): boolean {
  const key = ip.includes(":")
    ? ip.split(":").slice(0, 3).join(":")
    : ip.split(".").slice(0, 3).join(".");
  const now = Date.now();
  const entry = seen.get(key);
  if (!entry || entry.reset < now) {
    if (seen.size > 10_000) seen.clear();
    seen.set(key, { count: 1, reset: now + 60_000 });
    return false;
  }
  return ++entry.count > LIMIT_PER_MINUTE;
}

export const clientReportRoute = new Elysia({ prefix: "/client-report" }).post(
  "/",
  async ({ body, request, set }) => {
    set.status = 204;
    const h = request.headers;
    const ua = h.get("user-agent") ?? "";
    if (h.get("sec-gpc") === "1" || BOT.test(ua)) return;
    if (overLimit(h.get("cf-connecting-ip") ?? "")) return;
    await recordClientReport(body, ua);
  },
  {
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
