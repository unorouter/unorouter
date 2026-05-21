import { ParamError } from "../types";

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

// Hoist appUrl to its apex (strip leading "www.") then prefix "status." so
// deployments don't need an extra env var.
const statusUrlObj = new URL(appUrl);
statusUrlObj.hostname = `status.${statusUrlObj.hostname.replace(/^www\./, "")}`;

export const env = {
  apiUrl,
  appName,
  appUrl,
  // Bare origins (scheme + host, no path) of appUrl/apiUrl, derived once so
  // discovery routes and SEO helpers don't each re-parse the URL.
  siteOrigin: new URL(appUrl).origin,
  apiOrigin: new URL(apiUrl).origin,
  statusUrl: statusUrlObj.origin,
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
