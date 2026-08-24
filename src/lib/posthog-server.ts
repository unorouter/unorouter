import { IS_DEV, POSTHOG_DISABLED } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import { errMessage, safeJsonParse } from "@/lib/utils/base";
import { parseCookie } from "cookie";
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

// Never USER_ID_COOKIE: it is an iron-session seal, so it is not a stable id.
export function extractDistinctId(
  cookieHeader: string | undefined,
): string | undefined {
  const ph = Object.entries(parseCookie(cookieHeader ?? "")).find(([k]) =>
    /^ph_phc_.*_posthog$/.test(k),
  )?.[1];
  return safeJsonParse<{ distinct_id?: string }>(ph, {}).distinct_id;
}

export function captureServerEvent(args: {
  event: string;
  request?: Request;
  userId?: number | "guest" | null;
  properties?: Record<string, unknown>;
}): void {
  if (IS_DEV || POSTHOG_DISABLED) return;
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
      error: errMessage(err),
    });
  }
}
