import {
  ACCESS_TOKEN_COOKIE,
  msg,
  NEW_API_USER,
  USER_ID_COOKIE,
} from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import { verifyUserId } from "@/lib/utils/server";
import { serverEnv } from "@/server/env";
import { CLIENT_STORE_KEY } from "@/store/client-store";
import {
  type BodyMutations,
  hasBodyMutation,
  makeBodyMutationFetch,
} from "@/lib/ai/chat/provider-mutations";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { parseCookie } from "cookie";
import type { Cookie } from "elysia";

export const ADMIN_HEADERS = {
  Authorization: serverEnv.systemAccessToken,
  [NEW_API_USER]: "1",
};

export const upstreamApiUrl = serverEnv.internalApiUrl ?? env.apiUrl;

export async function getUserId<T extends boolean = false>(
  cookie: Record<string, Cookie<unknown>>,
  optional?: T,
): Promise<T extends true ? number | null : number> {
  const signed = cookie[USER_ID_COOKIE]?.value as string | undefined;
  const verified = await verifyUserId(signed);
  if (verified === null) {
    if (optional) return null as T extends true ? number | null : number;
    throw new Error(msg("ERRORS.UNAUTHORIZED"));
  }
  return verified as T extends true ? number | null : number;
}

export function getApiKey(cookie: Record<string, Cookie<unknown>>): string {
  const raw = cookie[CLIENT_STORE_KEY]?.value;
  if (!raw) throw new Error(msg("ERRORS.UNAUTHORIZED"));
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!parsed?.apiKey) throw new Error(msg("ERRORS.NO_API_KEY"));
    return parsed.apiKey as string;
  } catch {
    throw new Error(msg("ERRORS.UNAUTHORIZED"));
  }
}

export function getProvider(apiKey: string, opts?: BodyMutations) {
  return createOpenAICompatible({
    name: env.appName,
    baseURL: `${upstreamApiUrl}/v1`,
    apiKey,
    ...(hasBodyMutation(opts) ? { fetch: makeBodyMutationFetch(opts!) } : {}),
  });
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

  const clientIp =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip");
  if (clientIp) headers["X-Forwarded-For"] = clientIp;

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
