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
  posthogKey: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  googleSiteVerification: process.env.GOOGLE_SITE_VERIFICATION,
} as const;
