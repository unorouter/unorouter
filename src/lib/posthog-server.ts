import { env } from "@/lib/config/env";
import { PostHog } from "posthog-node";

let posthogInstance: PostHog = null!;

// Server-side exception capture only (src/instrumentation.ts). It sends no
// distinct id: there used to be an extractDistinctId here that read the
// ph_phc_* cookie off the request to attach a person, and the client now runs
// persistence "memory", so that cookie never exists. Do not reintroduce it
// without deciding the consent question it reopens.
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
