import { type Instrumentation } from "next";
import { IS_DEV } from "./lib/config/constants";

export async function register() {
  // Load dayjs plugins onto the singleton so bare `import dayjs from "dayjs"`
  // calls throughout the app pick them up without each file re-extending.
  await import("./lib/utils/date");

  // Server-side generation status sweeper. Only on the Node runtime - the
  // edge runtime has no DB client and the loop has no business there. The
  // sweeper is lazily started so a build that imports instrumentation for
  // edge route metadata doesn't load Drizzle on the wrong runtime.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startGenerationSweeper } = await import(
      "./server/generation/generation-sweeper"
    );
    startGenerationSweeper();
  }
}

export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
) => {
  if (IS_DEV) return;
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
        } catch {
          // Ignore malformed cookie
        }
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
