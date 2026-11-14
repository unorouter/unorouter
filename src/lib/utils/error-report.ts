import { NO_PERSONAL_DATA, stripEvent } from "@/lib/config/error-tracking";
import { env } from "@/lib/config/env";
import {
  BrowserClient,
  Scope,
  dedupeIntegration,
  defaultStackParser,
  linkedErrorsIntegration,
  makeFetchTransport,
  type ErrorEvent,
} from "@sentry/browser";

// First party (the tunnel route), no cookies, no identifier: the report is the
// error, the path and the build, inside the strictly necessary exemption of
// TDDDG 25(2) with no consent needed.
const MAX_PER_PAGE = 30;
// Network drops, aborted navigations and cross-origin script errors carry no
// stack of ours and are the bulk of every frontend error feed.
const NOISE =
  /^Script error\.?$|ResizeObserver loop|aborted|Failed to fetch|Load failed|NetworkError when attempting to fetch/i;

let sent = 0;
let client: BrowserClient | null | undefined;

// Extensions and injected scripts throw into our handlers too; only errors
// raised in our own bundles are ours to fix.
function fromOurBundles(event: ErrorEvent): boolean {
  return (event.exception?.values ?? []).some((v) =>
    v.stacktrace?.frames?.some((f) => f.filename?.includes("/_next/")),
  );
}

function getClient(): BrowserClient | null {
  if (client !== undefined) return client;
  client =
    typeof window === "undefined" || !env.glitchtipDsn
      ? null
      : new BrowserClient({
          dsn: env.glitchtipDsn,
          tunnel: "/api/ops/client-report",
          release: process.env.NEXT_PUBLIC_RELEASE_VERSION ?? "dev",
          transport: makeFetchTransport,
          transportOptions: { fetchOptions: { credentials: "omit" } },
          stackParser: defaultStackParser,
          integrations: [dedupeIntegration(), linkedErrorsIntegration()],
          dataCollection: NO_PERSONAL_DATA,
          sendClientReports: false,
          maxBreadcrumbs: 0,
          beforeSend: (event) => {
            if (sent >= MAX_PER_PAGE || !fromOurBundles(event)) return null;
            sent++;
            return stripEvent(event);
          },
        });
  client?.init();
  return client;
}

export function reportError(
  error: unknown,
  context: { source: string; componentStack?: string | null },
): void {
  const reporter = getClient();
  if (!reporter) return;
  if (
    error instanceof Error &&
    (error.name === "AbortError" || NOISE.test(error.message))
  )
    return;
  const scope = new Scope();
  scope.setTag("source", context.source.slice(0, 100));
  if (context.componentStack) {
    scope.setContext("react", {
      componentStack: context.componentStack.slice(0, 2000),
    });
  }
  reporter.captureException(error, undefined, scope);
}
