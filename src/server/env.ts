import { ParamError } from "@/lib/types";

export const serverEnv = {
  sessionSecret: process.env.SESSION_SECRET ?? "",
  // Cookies sealed before a rotation keep verifying until they expire (30d).
  sessionSecretPrevious: process.env.SESSION_SECRET_PREVIOUS ?? "",
  guestApiKey: process.env.GUEST_API_KEY,
  runwareApiKey: process.env.RUNWARE_API_KEY,
  internalApiUrl: process.env.INTERNAL_API_URL,
  // Lets a laptop BFF through the edge rules that challenge credential-less /api calls.
  edgeDevToken: process.env.EDGE_DEV_TOKEN ?? "",
  // Signs the edge-session cookie the Cloudflare skip rule verifies with
  // is_timed_hmac_valid_v0; the same value sits in the encrypted rules file.
  edgeSessionSecret: process.env.EDGE_SESSION_SECRET ?? "",
  // Proves to the gateway that a key resolution came from this server, not a
  // browser, so it is not audited as a human reveal. Optional: without it the
  // gateway simply keeps logging.
  bffServiceToken: process.env.BFF_SERVICE_TOKEN ?? "",
  // Cluster-internal Discord bot. Serves the live reward amounts; no public ingress.
  botInternalUrl: process.env.BOT_INTERNAL_URL ?? "http://unorouter-bot:4000",
  tursoUrl: process.env.TURSO_DATABASE_URL,
  tursoToken: process.env.TURSO_AUTH_TOKEN,
  tavilyApiKey: process.env.TAVILY_API_KEY,
  standalone: process.env.STANDALONE,
} as const;

if (typeof window === "undefined" && !process.env.NEXT_PHASE) {
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
  if (!serverEnv.edgeSessionSecret)
    warnings.push(
      "EDGE_SESSION_SECRET (logged-in users get no edge exemption)",
    );
  if (!serverEnv.tavilyApiKey)
    warnings.push("TAVILY_API_KEY (web search disabled)");
  if (!serverEnv.tursoUrl)
    warnings.push("TURSO_DATABASE_URL (database disabled)");
  if (warnings.length > 0)
    console.warn(`[env] Missing optional vars: ${warnings.join(", ")}`);
}
