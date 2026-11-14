import { scrubStack, scrubText } from "@/lib/utils/scrub";

// First party, no cookies, no identifier of any kind: the payload is only the
// error itself, the path and the build, which keeps it inside the strictly
// necessary exemption of TDDDG 25(2) and needs no consent.
const ENDPOINT = "/api/ops/client-report";
const RELEASE = process.env.NEXT_PUBLIC_RELEASE_VERSION ?? "dev";
const MAX_PER_PAGE = 30;
// Network drops, aborted navigations and cross-origin script errors carry no
// stack of ours and are the bulk of every frontend error feed.
const NOISE =
  /^Script error\.?$|ResizeObserver loop|aborted|Failed to fetch|Load failed|NetworkError when attempting to fetch/i;

let sent = 0;
const buckets = new Map<string, { tokens: number; at: number }>();

// Ten reports per error type, then one every ten seconds.
function allow(type: string): boolean {
  const now = Date.now();
  const b = buckets.get(type) ?? { tokens: 10, at: now };
  b.tokens = Math.min(10, b.tokens + (now - b.at) / 10_000);
  b.at = now;
  buckets.set(type, b);
  if (b.tokens < 1) return false;
  b.tokens -= 1;
  return true;
}

export function reportError(input: {
  source: string;
  name: string;
  message: string;
  stack: string;
  componentStack?: string | null;
}): void {
  if (typeof window === "undefined" || sent >= MAX_PER_PAGE) return;
  if (input.name === "AbortError" || NOISE.test(input.message)) return;
  // Extensions and injected scripts throw into our handlers too; only errors
  // raised in our own bundles are ours to fix.
  if (!input.stack.includes("/_next/")) return;
  if (!allow(input.name)) return;
  sent++;
  void fetch(ENDPOINT, {
    method: "POST",
    credentials: "omit",
    keepalive: true,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      source: input.source.slice(0, 100),
      name: input.name.slice(0, 100),
      message: scrubText(input.message).slice(0, 300),
      stack: scrubStack(input.stack).slice(0, 6000),
      componentStack: input.componentStack
        ? scrubStack(input.componentStack).slice(0, 2000)
        : undefined,
      path: location.pathname.slice(0, 200),
      release: RELEASE,
    }),
  }).catch(() => {});
}
