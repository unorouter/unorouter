import { type Instrumentation } from "next";
import { IS_DEV, POSTHOG_DISABLED } from "./lib/config/constants";

export async function register() {
  await import("./lib/utils/format/date");
}

export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
  context,
) => {
  if (IS_DEV || POSTHOG_DISABLED) return;
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { extractDistinctId, getPostHogServer } =
      await import("./lib/posthog-server");
    const posthog = getPostHogServer();
    const distinctId = extractDistinctId(
      Array.isArray(request.headers.cookie)
        ? request.headers.cookie.join("; ")
        : request.headers.cookie,
    );

    // Correlates this server stack to the opaque digest-only error the client
    // reports.
    const digest =
      err && typeof err === "object" && "digest" in err
        ? String((err as { digest?: unknown }).digest ?? "")
        : "";

    // notFound()/redirect() are control flow, not faults.
    if (/NEXT_HTTP_ERROR_FALLBACK|NEXT_REDIRECT|NEXT_NOT_FOUND/.test(digest)) {
      return;
    }

    // The peer hung up mid-stream.
    const message = err instanceof Error ? err.message : String(err ?? "");
    if (message.includes("failed to pipe response")) return;

    // Those same signals can arrive with digest AND message stripped, which the
    // check above cannot catch. Flooded 25k+ events per 48h, twice.
    if (!message.trim()) return;

    // Bots POST garbage that Next routes here and parses as Server Action
    // FormData. Unreachable surface, so scoped to the route rather than the
    // message, keeping real FormData faults reportable.
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
