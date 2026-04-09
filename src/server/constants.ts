import {
  ACCESS_TOKEN_COOKIE,
  GUEST_CONVS_COOKIE,
  msg,
  NEW_API_USER,
  USER_ID_COOKIE,
} from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import { serverEnv } from "@/server/env";
import { CLIENT_STORE_KEY } from "@/store/client-store";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { parseCookie } from "cookie";
import type { Cookie } from "elysia";

export const ADMIN_HEADERS = {
  Authorization: serverEnv.systemAccessToken,
  [NEW_API_USER]: "1",
};

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

export function getUserId<T extends boolean = false>(
  cookie: Record<string, Cookie<unknown>>,
  optional?: T,
): T extends true ? number | null : number {
  const raw = cookie[USER_ID_COOKIE]?.value;
  if (!raw) {
    if (optional) return null as T extends true ? number | null : number;
    throw new Error(msg("ERRORS.UNAUTHORIZED"));
  }
  return Number(raw) as T extends true ? number | null : number;
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

export function getApiKeyOrGuest(
  cookie: Record<string, Cookie<unknown>>,
): string {
  try {
    return getApiKey(cookie);
  } catch {
    if (serverEnv.guestApiKey) return serverEnv.guestApiKey;
    throw new Error(msg("ERRORS.UNAUTHORIZED"));
  }
}

export function getGuestConvIds(
  cookie: Record<string, Cookie<unknown>>,
): string[] {
  try {
    const raw = cookie[GUEST_CONVS_COOKIE]?.value;
    if (!raw) return [];
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "unorouter",
    baseURL: `${env.apiUrl}/v1`,
    apiKey,
  });
}

export function deriveUpstream({ request }: { request: Request }) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const headers: Record<string, string> = {};

  const requestId = request.headers.get("x-request-id");
  if (requestId) headers["x-request-id"] = requestId;

  if (cookieHeader) {
    headers.cookie = cookieHeader;
    const parsed = parseCookie(cookieHeader);
    const userId = parsed[USER_ID_COOKIE];
    if (userId) headers[NEW_API_USER] = userId;
    // Forward access_token cookie as Authorization header for OAuth token flow
    const accessToken = parsed[ACCESS_TOKEN_COOKIE];
    if (accessToken) headers.Authorization = accessToken;
  }
  return { upstream: { headers } };
}
