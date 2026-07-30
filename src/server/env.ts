import { ParamError } from "@/lib/types";

export const serverEnv = {
  systemAccessToken: process.env.SYSTEM_ACCESS_TOKEN as string,
  sessionSecret: process.env.SESSION_SECRET as string,
  guestApiKey: process.env.GUEST_API_KEY,
  internalApiUrl: process.env.INTERNAL_API_URL,
  // Cluster-internal Discord bot. Serves the live reward amounts; no public ingress.
  botInternalUrl: process.env.BOT_INTERNAL_URL ?? "http://unorouter-bot:4000",
  tursoUrl: process.env.TURSO_DATABASE_URL,
  tursoToken: process.env.TURSO_AUTH_TOKEN,
  tavilyApiKey: process.env.TAVILY_API_KEY,
  llmStatsApiKey: process.env.LLM_STATS_API_KEY,
  standalone: process.env.STANDALONE,
  port: process.env.PORT ?? "3000",
} as const;

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

if (typeof globalThis !== "undefined" && !process.env.NEXT_PHASE) {
  const warnings: string[] = [];
  if (!serverEnv.guestApiKey)
    warnings.push("GUEST_API_KEY (guest chat disabled)");
  if (!serverEnv.tavilyApiKey)
    warnings.push("TAVILY_API_KEY (web search disabled)");
  if (!serverEnv.tursoUrl)
    warnings.push("TURSO_DATABASE_URL (database disabled)");
  if (warnings.length > 0)
    console.warn(`[env] Missing optional vars: ${warnings.join(", ")}`);
}
