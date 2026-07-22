import { type Instrumentation } from "next";
import { IS_DEV, POSTHOG_DISABLED } from "./lib/config/constants";

export async function register() {
  await import("./lib/utils/format/date");

  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startGenerationSweeper } =
      await import("./server/ai/playground/playground-sweeper");
    startGenerationSweeper();
  }
}

export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
  context,
) => {
  if (IS_DEV || POSTHOG_DISABLED) return;
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getPostHogServer } = await import("./lib/posthog-server");
    const posthog = getPostHogServer();
    let distinctId: string | undefined;

    if (request.headers.cookie) {
      const cookieString = Array.isArray(request.headers.cookie)
        ? request.headers.cookie.join("; ")
        : request.headers.cookie;

      const postHogCookieMatch = cookieString.match(
        /ph_phc_.*?_posthog=([^;]+)/,
      );
      if (postHogCookieMatch?.[1]) {
        try {
          const decoded = decodeURIComponent(postHogCookieMatch[1]);
          const data = JSON.parse(decoded);
          distinctId = data.distinct_id;
        } catch {}
      }

      if (!distinctId) {
        const userIdMatch = cookieString.match(/user-id=([^;]+)/);
        if (userIdMatch?.[1]) {
          distinctId = userIdMatch[1];
        }
      }
    }

    // Client-side these surface as an opaque "Server Components render error"
    // with the real message stripped and only a `digest` to go on. Server-side
    // we still hold the REAL error + stack, so attach the digest (correlates to
    // the client event), the route being rendered, and the request path. That
    // turns an undebuggable digest into a locatable server stack.
    const digest =
      err && typeof err === "object" && "digest" in err
        ? String((err as { digest?: unknown }).digest ?? "")
        : "";

    // notFound()/redirect() are control-flow, not errors: Next signals them via
    // a digest (NEXT_HTTP_ERROR_FALLBACK;404, NEXT_REDIRECT, NEXT_NOT_FOUND).
    // Capturing them floods error tracking (e.g. iOS probing /apple-touch-icon).
    if (/NEXT_HTTP_ERROR_FALLBACK|NEXT_REDIRECT|NEXT_NOT_FOUND/.test(digest)) {
      return;
    }

    // A client aborting mid-stream (closing the tab / stopping a chat reply)
    // makes Next fail the SSE proxy pipe with "failed to pipe response".
    // That's the peer hanging up, not a server fault.
    const message = err instanceof Error ? err.message : String(err ?? "");
    if (message.includes("failed to pipe response")) return;

    // Next's own PPR invariants self-identify as framework bugs (postponed
    // state + fallback params on RSC prefetch); nothing in app code causes or
    // can fix them.
    if (message.includes("This is a bug in Next.js")) return;

    // DO NOT REMOVE. Background cache revalidation (`handleRevalidate`) of a
    // "use cache" page whose render throws a control-flow signal (notFound /
    // redirect for a churned-out :free model) rethrows it here with the digest
    // AND message already stripped: `Error` with value "", empty digest, source
    // "render", route the models [...slug] page. The digest guard above cannot
    // catch it (digest is empty by this point), so a message check is the only
    // handle. These carry zero actionable signal (no message, no digest, no
    // app frame) and flooded 25k+ events per 48h twice. Removing this guard
    // brings the flood straight back.
    if (!message.trim()) return;

    // DO NOT REMOVE. Bots POST garbage bodies at /RSC/*.txt and similar, which
    // Next routes to /_not-found/page and tries to parse as a Server Action
    // FormData ("Failed to parse body as FormData / no boundary"). It's
    // unreachable app surface (a 404 page), not a fault. Guard on the route so
    // a real error in a legit page still reports.
    if (context.routePath === "/_not-found/page") return;

    posthog.captureException(err, distinctId, {
      $exception_digest: digest || undefined,
      request_path: request.path,
      request_method: request.method,
      router_kind: context.routerKind,
      route_path: context.routePath,
      route_type: context.routeType,
      render_source: context.renderSource,
      revalidate_reason: context.revalidateReason,
    });
  }
};
