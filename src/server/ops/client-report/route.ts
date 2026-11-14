import { env } from "@/lib/config/env";
import { serverEnv } from "@/server/env";
import { rateLimit } from "@/server/rate-limit";
import { Elysia, t } from "elysia";

// Tunnel for the browser's error reports into GlitchTip (infra/glitchtip): only
// the envelope body goes on, never the visitor's address or headers, and only
// for our own project, so it cannot relay to anything else.
const BOT = /bot|crawl|spider|headless|lighthouse|slurp/i;
const dsn = env.glitchtipDsn ? new URL(env.glitchtipDsn) : null;

function ourProject(envelope: string): boolean {
  if (!dsn) return false;
  try {
    const header: unknown = JSON.parse(
      envelope.slice(0, envelope.indexOf("\n")),
    );
    if (typeof header !== "object" || header === null || !("dsn" in header))
      return false;
    const sent = new URL(String(header.dsn));
    return sent.username === dsn.username && sent.pathname === dsn.pathname;
  } catch {
    return false;
  }
}

export const clientReportRoute = new Elysia({ prefix: "/client-report" }).post(
  "/",
  async ({ body, request, status }) => {
    const h = request.headers;
    if (h.get("sec-gpc") === "1" || BOT.test(h.get("user-agent") ?? ""))
      return status(204);
    if (!dsn || !ourProject(body)) return status(403);
    const res = await fetch(
      `${serverEnv.glitchtipUrl}/api${dsn.pathname}/envelope/?sentry_key=${dsn.username}&sentry_version=7`,
      {
        method: "POST",
        headers: { "content-type": "application/x-sentry-envelope" },
        body,
        signal: AbortSignal.timeout(5000),
      },
    );
    return status(res.ok ? 200 : 502);
  },
  {
    beforeHandle: rateLimit("client-report", 60),
    parse: "text",
    body: t.String({ maxLength: 200_000 }),
  },
);
