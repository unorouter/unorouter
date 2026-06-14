import { safeFetchBytes } from "@/lib/config/r2";
import { logger } from "@/lib/utils/logger";
import { HTTP_MESSAGE_SIGNATURES_DIRECTORY } from "http-message-sig";
import { verify } from "web-bot-auth";
import { verifierFromJWK } from "web-bot-auth/crypto";
import { parseJwks, type PublicJwk } from "./keys";

const DIRECTORY_TTL_MS = 10 * 60 * 1000;

type CachedDirectory = { keys: PublicJwk[]; fetchedAt: number };

const directoryCache = new Map<string, CachedDirectory>();

async function fetchDirectoryKeys(origin: string): Promise<PublicJwk[]> {
  const cached = directoryCache.get(origin);
  if (cached && Date.now() - cached.fetchedAt < DIRECTORY_TTL_MS)
    return cached.keys;

      // The Signature-Agent origin is attacker-controlled and this fetch runs on every signed inbound request before any verification: require https and run the SSRF allowlist so it can't probe internal/RFC1918 hosts.
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== "https:") return [];
    const { buffer } = await safeFetchBytes(
      `${origin}${HTTP_MESSAGE_SIGNATURES_DIRECTORY}`,
      256 * 1024,
    );
    const keys = parseJwks(buffer.toString("utf8"));
    directoryCache.set(origin, { keys, fetchedAt: Date.now() });
    return keys;
  } catch (error) {
    logger.warn("Directory fetch error", {
      context: "web-bot-auth",
      origin,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

export type VerifiedAgent = {
  signatureAgent: string;
  origin: string;
  keyid: string;
};

export async function verifyInboundRequest(
  request: Request,
): Promise<VerifiedAgent | null> {
  const sig = request.headers.get("signature");
  const sigInput = request.headers.get("signature-input");
  const agentHeader = request.headers.get("signature-agent");
  if (!sig || !sigInput || !agentHeader) return null;

  const agentRaw = agentHeader.replace(/^"|"$/g, "").trim();
  let agentOrigin: string;
  try {
    agentOrigin = new URL(agentRaw).origin;
  } catch {
    return null;
  }

  const keys = await fetchDirectoryKeys(agentOrigin);
  if (keys.length === 0) return null;

  for (const jwk of keys) {
    try {
      const verifier = await verifierFromJWK(jwk);
      await verify(request, verifier);
      return {
        signatureAgent: agentRaw,
        origin: agentOrigin,
        keyid: (jwk as { kid?: string }).kid ?? "",
      };
    } catch {
      // wrong key, try next
    }
  }

  logger.info("Web Bot Auth verification failed", {
    context: "web-bot-auth",
    origin: agentOrigin,
  });
  return null;
}
