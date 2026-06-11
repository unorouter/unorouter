import "./lib/utils/format/date";

// posthog-js now self-initializes inside the lazy shim on first capture/identify
// (src/lib/posthog-lazy.ts); the first $pageview from PostHogProvider triggers it.
