export const env = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL,
  appName: process.env.NEXT_PUBLIC_APP_NAME,
  appUrl: process.env.NEXT_PUBLIC_URL,
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
  githubUrl: process.env.NEXT_PUBLIC_GITHUB_URL,
} as const;
