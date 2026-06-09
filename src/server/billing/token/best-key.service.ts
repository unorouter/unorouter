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

/**
 * Resolve the caller's best usable token from upstream, given their own
 * authenticated upstream headers (access_token + New-Api-User). Prefers an
 * enabled, unlimited-quota, auto-group token with NO model limits so every
 * model (including paid ones the user has balance for) is callable. Falls back
 * to the first enabled token, then null.
 *
 * Returns the RAW key (no `sk-` prefix), matching the upstream token object.
 *
 * Shared by the GET /best-key route and the chat key resolver so a logged-in
 * user never silently downgrades to the guest token when the client-store
 * cookie has not hydrated yet.
 */
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

/**
 * Build upstream auth headers (access_token + New-Api-User) from a logged-in
 * user's cookies, or null when not authenticated. Mirrors deriveUpstream's
 * auth derivation but works from the Elysia cookie record.
 */
async function authedUpstreamHeaders(
  cookie: Record<string, Cookie<unknown>>,
): Promise<Record<string, string> | null> {
  const accessToken = cookie[ACCESS_TOKEN_COOKIE]?.value as string | undefined;
  const signedUserId = cookie[USER_ID_COOKIE]?.value as string | undefined;
  const userId = await verifyUserId(signedUserId);
  if (!accessToken || userId === null) return null;
  return { Authorization: accessToken, [NEW_API_USER]: String(userId) };
}

/**
 * Resolve the API key for chat/title/playground server routes WITHOUT trusting
 * the client-store cookie alone.
 *
 * Order:
 *   1. client-store apiKey (logged-in + already hydrated) -> use it.
 *   2. logged-in but cookie not hydrated yet -> resolve the user's best key
 *      upstream from their own access_token. This closes the race where a
 *      freshly loaded chat fires a request before useApiKey writes the cookie,
 *      which previously fell through to the guest token and 403'd paid models.
 *   3. genuine guest -> guestApiKey.
 *   4. nothing -> throw.
 */
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
