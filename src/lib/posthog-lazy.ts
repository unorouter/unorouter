import type { PostHog } from "posthog-js";

// Lazy proxy keeping posthog-js (~63KiB gzip) out of every-page bundles.
// instrumentation-client.ts dynamically imports + inits it in prod when
// enabled, then registers the instance; calls made before that are queued.
let instance: PostHog | null = null;
const queue: Array<(p: PostHog) => void> = [];

function run(fn: (p: PostHog) => void) {
  if (instance) fn(instance);
  else queue.push(fn);
}

export function registerPostHog(p: PostHog) {
  instance = p;
  for (const fn of queue.splice(0)) fn(p);
}

export const posthog = {
  capture: (event: string, properties?: Record<string, unknown>) =>
    run((p) => p.capture(event, properties)),
  identify: (id: string, properties?: Record<string, unknown>) =>
    run((p) => p.identify(id, properties)),
  reset: () => run((p) => p.reset()),
  captureException: (error: Error) => run((p) => p.captureException(error)),
};
