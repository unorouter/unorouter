import {
  ACCESS_TOKEN_COOKIE,
  NEW_API_USER,
  USER_ID_COOKIE,
} from "@/lib/config/constants";
import { CLIENT_STORE_KEY } from "@/store/client-store";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { parseCookie } from "cookie";
import type { Cookie } from "elysia";

export const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export const ADMIN_HEADERS = {
  Authorization: process.env.SYSTEM_ACCESS_TOKEN,
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

export function getUserId(cookie: Record<string, Cookie<unknown>>): number {
  const raw = cookie[USER_ID_COOKIE]?.value;
  if (!raw) throw new Error("Unauthorized");
  return Number(raw);
}

export function getApiKey(cookie: Record<string, Cookie<unknown>>): string {
  const raw = cookie[CLIENT_STORE_KEY]?.value;
  if (!raw) throw new Error("Unauthorized");
  try {
    const parsed = JSON.parse(String(raw));
    if (!parsed.apiKey) throw new Error("No API key");
    return parsed.apiKey as string;
  } catch {
    throw new Error("Unauthorized");
  }
}

export function getProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "unorouter",
    baseURL: `${API_URL}/v1`,
    apiKey,
  });
}

export function deriveUpstream({ request }: { request: Request }) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const headers: Record<string, string> = {};
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
