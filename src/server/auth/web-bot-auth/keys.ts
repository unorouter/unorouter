import { errMessage, isRecord } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";

export type PublicJwk = JsonWebKey & {
  kty: "OKP";
  crv: "Ed25519";
  x: string;
  kid?: string;
};

function isPublicJwk(value: unknown): value is PublicJwk {
  if (!isRecord(value)) return false;
  return (
    value.kty === "OKP" &&
    value.crv === "Ed25519" &&
    typeof value.x === "string" &&
    value.x.length > 0
  );
}

export function stripPrivateFields(jwk: PublicJwk): PublicJwk {
  const kid = typeof jwk.kid === "string" ? jwk.kid : undefined;
  const alg = typeof jwk.alg === "string" ? jwk.alg : undefined;
  const use = typeof jwk.use === "string" ? jwk.use : undefined;
  return {
    kty: jwk.kty,
    crv: jwk.crv,
    x: jwk.x,
    ...(kid && { kid }),
    ...(alg && { alg }),
    ...(use && { use }),
  };
}

export function parseJwks(raw: string | undefined): PublicJwk[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter(isPublicJwk);
    if (isRecord(parsed) && Array.isArray(parsed.keys))
      return parsed.keys.filter(isPublicJwk);
    return isPublicJwk(parsed) ? [parsed] : [];
  } catch (error) {
    logger.error("Invalid JWKS JSON", {
      context: "web-bot-auth",
      error: errMessage(error),
    });
    return [];
  }
}
