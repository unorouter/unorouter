import { logger } from "@/lib/utils/logger";
import type { Signer } from "http-message-sig";
import { signerFromJWK } from "web-bot-auth/crypto";

export type PublicJwk = JsonWebKey & { kty: "OKP"; crv: "Ed25519"; x: string };
export type PrivateJwk = PublicJwk & { d: string };

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

export function stripPrivateFields(jwk: PublicJwk): PublicJwk {
  const clone: Record<string, unknown> = { ...jwk };
  delete clone.d;
  delete clone.p;
  delete clone.q;
  delete clone.dp;
  delete clone.dq;
  delete clone.qi;
  return clone as unknown as PublicJwk;
}

export function parsePrivateJwk(raw: string | undefined): PrivateJwk | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PrivateJwk;
    if (parsed.kty !== "OKP" || parsed.crv !== "Ed25519" || !parsed.d) {
      logger.error("Private JWK missing required Ed25519 fields", {
        context: "web-bot-auth",
      });
      return null;
    }
    return parsed;
  } catch (error) {
    logger.error("Invalid private JWK JSON", {
      context: "web-bot-auth",
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

let cachedSigner: Promise<Signer | null> | null = null;

export function getSigner(): Promise<Signer | null> {
  if (cachedSigner) return cachedSigner;
  const jwk = parsePrivateJwk(process.env.WEB_BOT_AUTH_PRIVATE_JWK);
  if (!jwk) return Promise.resolve(null);
  cachedSigner = signerFromJWK(jwk).catch((error) => {
    logger.error("Failed to import Web Bot Auth signer", {
      context: "web-bot-auth",
      error: error instanceof Error ? error.message : String(error),
    });
    cachedSigner = null;
    return null;
  });
  return cachedSigner;
}
