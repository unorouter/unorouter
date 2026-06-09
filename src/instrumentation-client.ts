import "./lib/utils/format/date";
import { IS_DEV, POSTHOG_DISABLED } from "./lib/config/constants";
import { env } from "./lib/config/env";
import { registerPostHog } from "./lib/posthog-lazy";

if (!IS_DEV && !POSTHOG_DISABLED && env.posthogHost) {
  // Dynamic so posthog-js stays out of the shared bundle when disabled.
  void import("posthog-js").then((m) => {
    m.default.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: env.posthogHost,
      ui_host: "https://eu.posthog.com",
      defaults: "2026-01-30",
      capture_performance: true,
      capture_heatmaps: true,
      capture_dead_clicks: true,
    });
    registerPostHog(m.default);
  });
}
