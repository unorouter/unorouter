export const serverEnv = {
  systemAccessToken: process.env.SYSTEM_ACCESS_TOKEN,
  sessionSecret: process.env.SESSION_SECRET,
  guestApiKey: process.env.GUEST_API_KEY,
  internalApiUrl: process.env.INTERNAL_API_URL,
  tursoUrl: process.env.TURSO_DATABASE_URL,
  tursoToken: process.env.TURSO_AUTH_TOKEN,
  r2AccountId: process.env.R2_ACCOUNT_ID,
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID,
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  r2PublicUrl: process.env.R2_PUBLIC_URL,
  r2Bucket: process.env.R2_BUCKET,
  tavilyApiKey: process.env.TAVILY_API_KEY,
  creemApiKey: process.env.CREEM_API_KEY,
  creemApiUrl: process.env.CREEM_API_URL,
  creemModerationEnabled: process.env.CREEM_MODERATION_ENABLED === "1",
  standalone: process.env.STANDALONE,
  port: process.env.PORT ?? "3000",
  redisUrl: process.env.REDIS_URL,
} as const;

// Warn about missing optional vars that disable features
if (typeof globalThis !== "undefined" && !process.env.NEXT_PHASE) {
  const warnings: string[] = [];
  if (!serverEnv.sessionSecret)
    warnings.push("SESSION_SECRET (user-id spoofable, chat auth broken)");
  if (!serverEnv.guestApiKey)
    warnings.push("GUEST_API_KEY (guest chat disabled)");
  if (
    !serverEnv.r2AccountId ||
    !serverEnv.r2AccessKeyId ||
    !serverEnv.r2SecretAccessKey
  )
    warnings.push("R2_* (media uploads disabled)");
  if (!serverEnv.tavilyApiKey)
    warnings.push("TAVILY_API_KEY (web search disabled)");
  if (!serverEnv.tursoUrl)
    warnings.push("TURSO_DATABASE_URL (database disabled)");
  if (serverEnv.creemModerationEnabled && !serverEnv.creemApiKey)
    warnings.push("CREEM_API_KEY (image/video generation will fail closed)");
  if (serverEnv.creemModerationEnabled && !serverEnv.creemApiUrl)
    warnings.push("CREEM_API_URL (image/video generation will fail closed)");
  if (warnings.length > 0)
    console.warn(`[env] Missing optional vars: ${warnings.join(", ")}`);
}
