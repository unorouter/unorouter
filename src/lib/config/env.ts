import { ParamError } from "@/lib/errors";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const appUrl = process.env.NEXT_PUBLIC_URL;
const appName = process.env.NEXT_PUBLIC_APP_NAME;
const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

if (!apiUrl)
  throw new ParamError("ERRORS.MISSING_ENV", { var: "NEXT_PUBLIC_API_URL" });
if (!appUrl)
  throw new ParamError("ERRORS.MISSING_ENV", { var: "NEXT_PUBLIC_URL" });
if (!appName)
  throw new ParamError("ERRORS.MISSING_ENV", { var: "NEXT_PUBLIC_APP_NAME" });
if (!supportEmail)
  throw new ParamError("ERRORS.MISSING_ENV", {
    var: "NEXT_PUBLIC_SUPPORT_EMAIL",
  });

// Hoist appUrl to its apex (strip leading "www." if present) then prefix
// "status." so deployments don't need an extra env var.
function deriveStatusUrl(url: string): string {
  const u = new URL(url);
  u.hostname = `status.${u.hostname.replace(/^www\./, "")}`;
  return u.origin;
}

export const env = {
  apiUrl,
  appName,
  appUrl,
  statusUrl: deriveStatusUrl(appUrl),
  supportEmail,
  githubUrl: process.env.NEXT_PUBLIC_GITHUB_URL,
  discordUrl: process.env.NEXT_PUBLIC_DISCORD_URL,
  twitterHandle: process.env.NEXT_PUBLIC_TWITTER_HANDLE,
  twitterUrl: process.env.NEXT_PUBLIC_TWITTER_HANDLE
    ? `https://x.com/${process.env.NEXT_PUBLIC_TWITTER_HANDLE.replace(/^@/, "")}`
    : undefined,
  trustpilotUrl: process.env.NEXT_PUBLIC_TRUSTPILOT_URL,
  posthogKey: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  posthogHost: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  googleSiteVerification: process.env.GOOGLE_SITE_VERIFICATION,
} as const;
