const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const appUrl = process.env.NEXT_PUBLIC_URL;

if (!apiUrl) throw new Error("Missing required env: NEXT_PUBLIC_API_URL");
if (!appUrl) throw new Error("Missing required env: NEXT_PUBLIC_URL");

export const env = {
  apiUrl,
  appName: process.env.NEXT_PUBLIC_APP_NAME,
  appUrl,
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
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
