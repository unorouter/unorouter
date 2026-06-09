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

export function getProvider(
  apiKey: string,
  opts?: { injectCacheControl?: boolean },
) {
  return createOpenAICompatible({
    name: env.appName,
    baseURL: `${upstreamApiUrl}/v1`,
    apiKey,
    // Anthropic prompt caching: the OpenAI-compatible upstream (new-api /
    // OpenRouter) forwards `cache_control` markers placed on message content
    // blocks to the Anthropic API. ai-sdk's openai-compatible provider does not
    // emit them, so a fetch wrapper injects them into the outgoing body when the
    // model supports caching. No-op on channels that ignore the field.
    ...(opts?.injectCacheControl
      ? { fetch: cacheControlFetch as typeof fetch }
      : {}),
  });
}

// Mark the system prompt + the last user message with `cache_control: ephemeral`
// so a long, stable RP prefix (character cards, lorebook, persona) is cached by
// the upstream Anthropic channel. Best-effort: any parse failure forwards the
// request untouched.
const cacheControlFetch: typeof fetch = async (input, init) => {
  try {
    if (init?.body && typeof init.body === "string") {
      const body = JSON.parse(init.body) as {
        messages?: { role: string; content: unknown }[];
      };
      if (Array.isArray(body.messages) && body.messages.length > 0) {
        const mark = (content: unknown): unknown => {
          // String content -> wrap into a single text block carrying the marker.
          if (typeof content === "string") {
            return [
              {
                type: "text",
                text: content,
                cache_control: { type: "ephemeral" },
              },
            ];
          }
          // Block array -> mark the last block.
          if (Array.isArray(content) && content.length > 0) {
            const last = content[content.length - 1];
            if (last && typeof last === "object") {
              (last as Record<string, unknown>).cache_control = {
                type: "ephemeral",
              };
            }
            return content;
          }
          return content;
        };
        const sys = body.messages.find((m) => m.role === "system");
        if (sys) sys.content = mark(sys.content);
        // Last user message anchors the cache breakpoint before generation.
        for (let i = body.messages.length - 1; i >= 0; i--) {
          if (body.messages[i].role === "user") {
            body.messages[i].content = mark(body.messages[i].content);
            break;
          }
        }
        init = { ...init, body: JSON.stringify(body) };
      }
    }
  } catch {
    // fall through with the original init
  }
  return fetch(input, init);
};

export async function deriveUpstream({ request }: { request: Request }) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const headers: Record<string, string> = {};

  const requestId = request.headers.get("x-request-id");
  if (requestId) headers["x-request-id"] = requestId;

  if (cookieHeader) {
    headers.cookie = cookieHeader;
    const parsed = parseCookie(cookieHeader);
    const accessToken = parsed[ACCESS_TOKEN_COOKIE];
    if (accessToken) headers.Authorization = accessToken;
    const verified = await verifyUserId(parsed[USER_ID_COOKIE]);
    if (verified !== null) headers[NEW_API_USER] = String(verified);
  }
  return { upstream: { headers } };
}
