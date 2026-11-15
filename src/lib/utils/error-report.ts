import { NO_PERSONAL_DATA, stripEvent } from "@/lib/config/error-tracking";
import { env } from "@/lib/config/env";
import type { BrowserClient, ErrorEvent } from "@sentry/browser";

// First party (the tunnel route), no cookies, no identifier: the report is the
// error, the path, the browser family and the build, inside the strictly
// necessary exemption of TDDDG 25(2) with no consent needed.
const MAX_PER_PAGE = 30;
// Network drops, aborted navigations and cross-origin script errors carry no
// stack of ours and are the bulk of every frontend error feed.
const NOISE =
  /^Script error\.?$|ResizeObserver loop|aborted|Failed to fetch|Load failed|NetworkError when attempting to fetch/i;

const BROWSERS: [string, RegExp][] = [
  ["Edge", /Edg\/(\d+)/],
  ["Opera", /OPR\/(\d+)/],
  ["Samsung", /SamsungBrowser\/(\d+)/],
  ["Firefox", /(?:Firefox|FxiOS)\/(\d+)/],
  ["Chrome", /(?:Chrome|CriOS)\/(\d+)/],
  ["Safari", /Version\/(\d+).*Safari/],
];
const SYSTEMS: [string, RegExp][] = [
  ["iOS", /iPhone|iPad|iPod/],
  ["Android", /Android/],
  ["Windows", /Windows/],
  ["macOS", /Mac OS X/],
  ["Linux", /Linux|CrOS/],
];

// Family and major version only: enough to tell an old Safari from a bug.
function browserTags(ua: string): Record<string, string> {
  const browser = BROWSERS.find((b) => b[1].test(ua));
  const os = SYSTEMS.find((o) => o[1].test(ua));
  return {
    browser: browser ? `${browser[0]} ${ua.match(browser[1])?.[1]}` : "other",
    os: os ? os[0] : "other",
  };
}

let sent = 0;
let client: Promise<BrowserClient | null> | undefined;

// Extensions and injected scripts throw into our handlers too; only errors
// raised in our own bundles are ours to fix.
function fromOurBundles(event: ErrorEvent): boolean {
  return (event.exception?.values ?? []).some((v) =>
    v.stacktrace?.frames?.some((f) => f.filename?.includes("/_next/")),
  );
}

// The SDK is fetched on the first error, so a page without errors never loads it.
async function createClient(): Promise<BrowserClient | null> {
  if (typeof window === "undefined" || !env.glitchtipDsn) return null;
  const sentry = await import("@sentry/browser");
  const created = new sentry.BrowserClient({
    dsn: env.glitchtipDsn,
    tunnel: "/api/ops/client-report",
    release: process.env.NEXT_PUBLIC_RELEASE_VERSION ?? "dev",
    transport: sentry.makeFetchTransport,
    transportOptions: { fetchOptions: { credentials: "omit" } },
    stackParser: sentry.defaultStackParser,
    integrations: [
      sentry.dedupeIntegration(),
      sentry.linkedErrorsIntegration(),
    ],
    dataCollection: NO_PERSONAL_DATA,
    sendClientReports: false,
    maxBreadcrumbs: 0,
    beforeSend: (event) => {
      if (sent >= MAX_PER_PAGE || !fromOurBundles(event)) return null;
      sent++;
      event.request = { url: location.origin + location.pathname };
      event.tags = { ...event.tags, ...browserTags(navigator.userAgent) };
      return stripEvent(event);
    },
  });
  created.init();
  return created;
}

export function reportError(
  error: unknown,
  context: { source: string; componentStack?: string | null },
): void {
  if (
    error instanceof Error &&
    (error.name === "AbortError" || NOISE.test(error.message))
  )
    return;
  client ??= createClient().catch(() => null);
  void client.then(async (reporter) => {
    if (!reporter) return;
    const { Scope } = await import("@sentry/browser");
    const scope = new Scope();
    scope.setTag("source", context.source.slice(0, 100));
    if (context.componentStack) {
      scope.setContext("react", {
        componentStack: context.componentStack.slice(0, 2000),
      });
    }
    reporter.captureException(error, undefined, scope);
  });
}
