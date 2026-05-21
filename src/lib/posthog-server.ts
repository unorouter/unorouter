import { IS_DEV } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import { logger } from "@/lib/utils/logger";
import { PostHog } from "posthog-node";

let posthogInstance: PostHog = null!;

export function getPostHogServer() {
  if (!posthogInstance) {
    posthogInstance = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      host: env.posthogHost ?? "https://eu.i.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return posthogInstance;
}

// Extracts the PostHog distinctId from request cookies. Mirrors the logic in
// instrumentation.ts.onRequestError so server events stitch to the same user.
function extractDistinctId(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  const phMatch = cookieHeader.match(/ph_phc_.*?_posthog=([^;]+)/);
  if (phMatch?.[1]) {
    try {
      const parsed = JSON.parse(decodeURIComponent(phMatch[1]));
      if (typeof parsed?.distinct_id === "string") return parsed.distinct_id;
    } catch {
      // Malformed cookie, fall through.
    }
  }
  const userIdMatch = cookieHeader.match(/user-id=([^;]+)/);
  return userIdMatch?.[1] ?? null;
}

export function captureServerEvent(args: {
  event: string;
  request?: Request;
  userId?: number | "guest" | null;
  properties?: Record<string, unknown>;
}): void {
  if (IS_DEV) return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;

  const cookieHeader = args.request?.headers.get("cookie") ?? undefined;
  const distinctId =
    extractDistinctId(cookieHeader) ??
    (args.userId != null ? String(args.userId) : "guest");

  try {
    getPostHogServer().capture({
      distinctId,
      event: args.event,
      properties: args.properties ?? {},
    });
  } catch (err) {
    logger.warn("PostHog server capture failed", {
      context: "posthog.server",
      event: args.event,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
