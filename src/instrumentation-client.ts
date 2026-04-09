import { IS_DEV } from "./lib/config/constants";
import posthog from "posthog-js";

if (!IS_DEV) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: "https://ph.unorouter.ai",
    ui_host: "https://eu.posthog.com",
    defaults: "2026-01-30",
    capture_performance: true,
    capture_heatmaps: true,
    capture_dead_clicks: true,
  });
}
