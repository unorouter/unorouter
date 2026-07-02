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

export async function getServerCookieHeader(): Promise<string> {
  if (typeof window !== "undefined") return "";
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    return cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");
  } catch {
    return "";
  }
}

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
    // ai-sdk's openai-compatible provider can't emit these fields; the fetch wrapper rewrites the JSON body. No-op when ignored.
    ...(hasBodyMutation(opts) ? { fetch: makeBodyMutationFetch(opts!) } : {}),
  });
}

export async function deriveUpstream({ request }: { request: Request }) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const headers: Record<string, string> = {};

  const requestId = request.headers.get("x-request-id");
  if (requestId) headers["x-request-id"] = requestId;

  if (cookieHeader) {
    const parsed = parseCookie(cookieHeader);
    const accessToken = parsed[ACCESS_TOKEN_COOKIE];
    if (accessToken) headers.Authorization = accessToken;
    const verified = await verifyUserId(parsed[USER_ID_COOKIE]);
    if (verified !== null) headers[NEW_API_USER] = String(verified);
    // Token auth wins: with an access token present, strip the gin "session"
    // cookie before forwarding, else upstream prefers a stale session identity
    // and every call 401s with a New-Api-User mismatch. Password-login users
    // have no access token and authenticate upstream via that session cookie,
    // so it must keep flowing for them.
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
