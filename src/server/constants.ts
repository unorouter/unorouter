import {
  ACCESS_TOKEN_COOKIE,
  AUTO_GROUP,
  msg,
  NEW_API_USER,
  SECURITY_PROOF_HEADER,
  USER_ID_COOKIE,
} from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import { isRecord } from "@/lib/utils/base";
import { verifyUserId } from "@/lib/utils/session-cookie";
import { serverEnv } from "@/server/env";
import { CLIENT_STORE_KEY } from "@/store/client-store";
import {
  type BodyMutations,
  makeUpstreamFetch,
} from "@/lib/ai/chat/provider-mutations";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { parseCookie } from "cookie";
import { status, type Cookie } from "elysia";

export const upstreamApiUrl = serverEnv.internalApiUrl ?? env.apiUrl;

// True when upstream calls leave through Cloudflare, which happens only in local
// dev: the cluster sets INTERNAL_API_URL to the ClusterIP.
export const upstreamIsProxied = upstreamApiUrl === env.apiUrl;

// Proves a gateway call came from this server, never the browser: the gateway then
// skips the key-reveal audit and leaves generated image links unwrapped, since
// every such image is downloaded and marked here.
export function bffServiceHeader(): Record<string, string> {
  const token = serverEnv.bffServiceToken;
  return token ? { "X-Bff-Service-Token": token } : {};
}

// "auto" means let the gateway pick, so the header is omitted entirely rather
// than sent with a sentinel value.
export function groupHeader(group?: string | null): Record<string, string> {
  return group && group !== AUTO_GROUP ? { "X-Group": group } : {};
}

export async function getUserId(
  cookie: Record<string, Cookie<unknown>>,
  optional: true,
): Promise<number | null>;
export async function getUserId(
  cookie: Record<string, Cookie<unknown>>,
  optional?: false,
): Promise<number>;
export async function getUserId(
  cookie: Record<string, Cookie<unknown>>,
  optional?: boolean,
): Promise<number | null> {
  const verified = await verifyUserId(
    cookieString(cookie[USER_ID_COOKIE]?.value),
  );
  if (verified === null) {
    if (optional) return null;
    throw status(401, msg("ERRORS.UNAUTHORIZED"));
  }
  return verified;
}

export function cookieString(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function parseClientStore(raw: unknown): unknown {
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export function getApiKey(cookie: Record<string, Cookie<unknown>>): string {
  const raw = cookie[CLIENT_STORE_KEY]?.value;
  if (!raw) throw status(401, msg("ERRORS.UNAUTHORIZED"));
  const parsed = parseClientStore(raw);
  if (!isRecord(parsed)) throw status(401, msg("ERRORS.UNAUTHORIZED"));
  const apiKey = parsed.apiKey;
  if (typeof apiKey !== "string" || !apiKey)
    throw status(401, msg("ERRORS.NO_API_KEY"));
  return apiKey;
}

export function getProvider(
  apiKey: string,
  opts?: BodyMutations,
  group?: string | null,
) {
  const headers = groupHeader(group);
  return createOpenAICompatible({
    name: env.appName,
    baseURL: `${upstreamApiUrl}/v1`,
    apiKey,
    ...(Object.keys(headers).length > 0 ? { headers } : {}),
    fetch: makeUpstreamFetch(opts),
  });
}

// Cloudflare sets this and overwrites any client copy; X-Forwarded-For and
// X-Real-IP come from the client and would let anyone pick their own key.
export function getClientIp(headers: Headers): string | null {
  return headers.get("cf-connecting-ip");
}

export async function deriveUpstream({ request }: { request: Request }) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const headers: Record<string, string> = {};

  const requestId = request.headers.get("x-request-id");
  if (requestId) headers["x-request-id"] = requestId;

  // Payment checkouts return the user to whichever site started them. Upstream
  // otherwise falls back to its own console, which is where users landed after
  // paying. Upstream only honors an origin it already has configured.
  headers["X-Return-Base"] = env.siteOrigin;

  const clientIp = getClientIp(request.headers);
  // CF-Connecting-IP, not X-Forwarded-For: the gateway trusts only the former,
  // because XFF is append-style and any pod can prepend to it. Sending XFF here
  // meant the gateway discarded it and audited the BFF pod address instead, so
  // 64% of logins became unattributable and the alerts keyed on logs.ip went
  // blind on every request that arrives through this site.
  // Skipped when the upstream is the public hostname (local dev): Cloudflare
  // reserves this header and rejects any request carrying one with error 1000.
  if (clientIp && !upstreamIsProxied) headers["CF-Connecting-IP"] = clientIp;
  const country = request.headers.get("cf-ipcountry");
  if (country && !upstreamIsProxied) headers["CF-IPCountry"] = country;
  const ray = request.headers.get("cf-ray");
  if (ray && !upstreamIsProxied) headers["CF-Ray"] = ray;
  // The gateway keys login sessions and audit rows on the User-Agent; without
  // this every web login reads as the server runtime.
  const userAgent = request.headers.get("user-agent");
  if (userAgent) headers["User-Agent"] = userAgent;
  // A step-up proof is single use and bound to one scope, so forwarding it on
  // every call only matters for the routes that consume it.
  const proof = request.headers.get(SECURITY_PROOF_HEADER);
  if (proof) headers[SECURITY_PROOF_HEADER] = proof;
  if (upstreamIsProxied && serverEnv.edgeDevToken)
    headers["x-edge-dev"] = serverEnv.edgeDevToken;

  if (cookieHeader) {
    const parsed = parseCookie(cookieHeader);
    const accessToken = parsed[ACCESS_TOKEN_COOKIE];
    if (accessToken) headers.Authorization = accessToken;
    const verified = await verifyUserId(parsed[USER_ID_COOKIE]);
    if (verified !== null) headers[NEW_API_USER] = String(verified);
    const forwarded = accessToken
      ? cookieHeader
          .split(";")
          .map((c) => c.trim())
          .filter((c) => !c.startsWith("session="))
          .join("; ")
      : cookieHeader;
    if (forwarded) headers.cookie = forwarded;
  }
  return { upstream: { headers } };
}
