export const serverEnv = {
  systemAccessToken: process.env.SYSTEM_ACCESS_TOKEN,
  guestApiKey: process.env.GUEST_API_KEY,
  tursoUrl: process.env.TURSO_DATABASE_URL,
  tursoToken: process.env.TURSO_AUTH_TOKEN,
  r2AccountId: process.env.R2_ACCOUNT_ID,
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID,
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  r2PublicUrl: process.env.R2_PUBLIC_URL,
  tavilyApiKey: process.env.TAVILY_API_KEY,
  standalone: process.env.STANDALONE,
  port: process.env.PORT ?? "3000",
} as const;

// Warn about missing optional vars that disable features
if (typeof globalThis !== "undefined" && !process.env.NEXT_PHASE) {
  const warnings: string[] = [];
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
  if (warnings.length > 0)
    console.warn(`[env] Missing optional vars: ${warnings.join(", ")}`);
}
