import { ParamError } from "@/lib/types";

export const serverEnv = {
  systemAccessToken: process.env.SYSTEM_ACCESS_TOKEN as string,
  sessionSecret: process.env.SESSION_SECRET as string,
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
} as const;

// Required server vars. Fail fast at module load instead of crashing on the
// first request. SESSION_SECRET seals the user-id cookie via iron-session;
// SYSTEM_ACCESS_TOKEN authorizes upstream admin calls.
if (typeof window === "undefined" && !process.env.NEXT_PHASE) {
  if (!serverEnv.systemAccessToken)
    throw new ParamError("ERRORS.MISSING_ENV", { var: "SYSTEM_ACCESS_TOKEN" });
  if (!serverEnv.sessionSecret)
    throw new ParamError("ERRORS.MISSING_ENV", { var: "SESSION_SECRET" });
  if (serverEnv.sessionSecret.length < 32)
    throw new Error(
      "SESSION_SECRET too short (iron-session needs >= 32 chars)",
    );
}

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
  if (serverEnv.creemModerationEnabled && !serverEnv.creemApiKey)
    warnings.push("CREEM_API_KEY (image/video generation will fail closed)");
  if (serverEnv.creemModerationEnabled && !serverEnv.creemApiUrl)
    warnings.push("CREEM_API_URL (image/video generation will fail closed)");
  if (warnings.length > 0)
    console.warn(`[env] Missing optional vars: ${warnings.join(", ")}`);
}
