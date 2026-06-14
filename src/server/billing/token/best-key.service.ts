import {
  ACCESS_TOKEN_COOKIE,
  msg,
  NEW_API_USER,
  USER_ID_COOKIE,
} from "@/lib/config/constants";
import { verifyUserId } from "@/lib/utils/server";
import { getTokenKey, searchTokens } from "@/openapi";
import { getApiKey } from "@/server/constants";
import { serverEnv } from "@/server/env";
import type { Cookie } from "elysia";

    // Best usable upstream token: enabled + unlimited-quota + auto-group + no model limits, falling back to the first enabled token, then null. Returns the RAW key (no sk- prefix).
export async function resolveBestKey(
  headers: Record<string, string>,
): Promise<string | null> {
  const res = await searchTokens({ p: 1, page_size: 100 }, { headers });
  const tokens = res.data?.data?.items;
  if (!tokens?.length) return null;

  const best =
    tokens.find(
      (tok) =>
        tok &&
        tok.status === 1 &&
        tok.unlimited_quota &&
        tok.group === "auto" &&
        !tok.model_limits_enabled,
    ) ?? tokens.find((tok) => tok && tok.status === 1);

  if (!best) return null;

  const keyRes = await getTokenKey(String(best.id), { headers });
  return keyRes.data?.data?.key ?? null;
}

// deriveUpstream's auth derivation, but from the Elysia cookie record; null when unauthenticated.
async function authedUpstreamHeaders(
  cookie: Record<string, Cookie<unknown>>,
): Promise<Record<string, string> | null> {
  const accessToken = cookie[ACCESS_TOKEN_COOKIE]?.value as string | undefined;
  const signedUserId = cookie[USER_ID_COOKIE]?.value as string | undefined;
  const userId = await verifyUserId(signedUserId);
  if (!accessToken || userId === null) return null;
  return { Authorization: accessToken, [NEW_API_USER]: String(userId) };
}

    // Key order: client-store apiKey -> best key via the user's own access_token (closes the pre-hydration race that fell through to the guest token and 403'd paid models) -> guestApiKey -> throw.
export async function resolveChatApiKey(
  cookie: Record<string, Cookie<unknown>>,
): Promise<string> {
  try {
    return getApiKey(cookie);
  } catch {
    // fall through to server-side resolution
  }

  const headers = await authedUpstreamHeaders(cookie);
  if (headers) {
    const key = await resolveBestKey(headers);
    if (key) return `sk-${key}`;
  }

  if (serverEnv.guestApiKey) return serverEnv.guestApiKey;
  throw new Error(msg("ERRORS.UNAUTHORIZED"));
}
