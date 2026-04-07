export const serverEnv = {
  systemAccessToken: process.env.SYSTEM_ACCESS_TOKEN,
  tursoUrl: process.env.TURSO_DATABASE_URL,
  tursoToken: process.env.TURSO_AUTH_TOKEN,
  r2AccountId: process.env.R2_ACCOUNT_ID,
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID,
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  r2PublicUrl: process.env.R2_PUBLIC_URL,
  tavilyApiKey: process.env.TAVILY_API_KEY,
  port: process.env.PORT ?? "3000",
} as const;
