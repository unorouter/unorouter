import { logger } from "@/lib/utils/logger";

export type PublicJwk = JsonWebKey & { kty: "OKP"; crv: "Ed25519"; x: string };

type MaybeJwks = PublicJwk | PublicJwk[] | { keys: PublicJwk[] };

export function parseJwks(raw: string | undefined): PublicJwk[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as MaybeJwks;
    if (Array.isArray(parsed)) return parsed;
    if ("keys" in parsed && Array.isArray(parsed.keys)) return parsed.keys;
    return [parsed as PublicJwk];
  } catch (error) {
    logger.error("Invalid JWKS JSON", {
      context: "web-bot-auth",
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}
