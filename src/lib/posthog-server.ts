import { env } from "@/lib/config/env";
import { safeJsonParse } from "@/lib/utils/base";
import { parseCookie } from "cookie";
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
