import { type Instrumentation } from "next";
import { IS_DEV, POSTHOG_DISABLED } from "./lib/config/constants";

export async function register() {
  // Extend dayjs singleton for bare imports.
  await import("./lib/utils/format/date");

  // Sweeper nodejs-only; lazy to keep edge metadata builds free of Drizzle.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startGenerationSweeper } =
      await import("./server/ai/playground/playground-sweeper");
    startGenerationSweeper();
  }
}

export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
) => {
  if (IS_DEV || POSTHOG_DISABLED) return;
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getPostHogServer } = await import("./lib/posthog-server");
    const posthog = getPostHogServer();
    let distinctId: string | undefined;

    if (request.headers.cookie) {
      const cookieString = Array.isArray(request.headers.cookie)
        ? request.headers.cookie.join("; ")
        : request.headers.cookie;

      const postHogCookieMatch = cookieString.match(
        /ph_phc_.*?_posthog=([^;]+)/,
      );
      if (postHogCookieMatch?.[1]) {
        try {
          const decoded = decodeURIComponent(postHogCookieMatch[1]);
          const data = JSON.parse(decoded);
          distinctId = data.distinct_id;
        } catch {}
      }

      if (!distinctId) {
        const userIdMatch = cookieString.match(/user-id=([^;]+)/);
        if (userIdMatch?.[1]) {
          distinctId = userIdMatch[1];
        }
      }
    }

    await posthog.captureException(err, distinctId);
  }
};
