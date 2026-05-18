import "./lib/utils/format/date";
import { IS_DEV } from "./lib/config/constants";
import { env } from "./lib/config/env";
import posthog from "posthog-js";

if (!IS_DEV && env.posthogHost) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: env.posthogHost,
    ui_host: "https://eu.posthog.com",
    defaults: "2026-01-30",
    capture_performance: true,
    capture_heatmaps: true,
    capture_dead_clicks: true,
  });
}
