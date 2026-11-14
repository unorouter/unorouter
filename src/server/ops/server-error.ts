import { NO_PERSONAL_DATA, stripEvent } from "@/lib/config/error-tracking";
import { env } from "@/lib/config/env";
import { serverEnv } from "@/server/env";
import { Scope, createStackParser, createTransport } from "@sentry/core";
import { ServerRuntimeClient, nodeStackLineParser } from "@sentry/core/server";

// Server render and BFF errors into the same GlitchTip project as the browser's,
// sent straight to its in-cluster address.
let client: ServerRuntimeClient | null | undefined;

function getClient(): ServerRuntimeClient | null {
  if (client !== undefined) return client;
  if (!env.glitchtipDsn) return (client = null);
  const dsn = new URL(env.glitchtipDsn);
  const internal = new URL(serverEnv.glitchtipUrl);
  dsn.protocol = internal.protocol;
  dsn.host = internal.host;
  client = new ServerRuntimeClient({
    dsn: dsn.toString(),
    release: process.env.NEXT_DEPLOYMENT_ID || undefined,
    platform: "node",
    stackParser: createStackParser(nodeStackLineParser()),
    integrations: [],
    dataCollection: NO_PERSONAL_DATA,
    beforeSend: stripEvent,
    transport: (options) =>
      createTransport(options, async (request) => {
        const res = await fetch(options.url, {
          method: "POST",
          body:
            typeof request.body === "string"
              ? request.body
              : new Uint8Array(request.body),
          signal: AbortSignal.timeout(5000),
        });
        return {
          statusCode: res.status,
          headers: {
            "x-sentry-rate-limits": res.headers.get("x-sentry-rate-limits"),
            "retry-after": res.headers.get("retry-after"),
          },
        };
      }),
  });
  client.init();
  return client;
}

export function recordServerError(
  error: unknown,
  where: { source: string; route: string; path: string; method: string },
): void {
  const reporter = getClient();
  if (!reporter) return;
  const scope = new Scope();
  scope.setTag("source", where.source);
  scope.setTag("route", where.route);
  scope.setTag("method", where.method);
  scope.setContext("request", { path: where.path.split(/[?#]/)[0] });
  reporter.captureException(error, undefined, scope);
}
