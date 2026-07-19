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

export async function resolveBestKey(
  headers: Record<string, string>,
): Promise<string | null> {
  const res = await searchTokens({ p: 1, page_size: 100 }, { headers });
  const tokens = res.data?.data?.items;
  if (!tokens?.length) return null;

  // Group-pinned tokens (billing group locked to one channel-group) are a
  // routing trap: if that group's channel churns away, every request through
  // the token dies with get_channel_failed. Prefer unpinned tokens; a pinned
  // one is only the last resort when the account has nothing else.
  const enabled = tokens.filter((tok) => tok && tok.status === 1);
  const unpinned = (group?: string | null) =>
    !group || group === "auto" || group === "default";
  const best =
    enabled.find(
      (tok) =>
        tok.unlimited_quota &&
        tok.group === "auto" &&
        !tok.model_limits_enabled,
    ) ??
    enabled.find((tok) => unpinned(tok.group) && !tok.model_limits_enabled) ??
    enabled.find((tok) => unpinned(tok.group)) ??
    enabled[0];

  if (!best) return null;

  const keyRes = await getTokenKey(String(best.id), { headers });
  return keyRes.data?.data?.key ?? null;
}

async function authedUpstreamHeaders(
  cookie: Record<string, Cookie<unknown>>,
): Promise<Record<string, string> | null> {
  const accessToken = cookie[ACCESS_TOKEN_COOKIE]?.value as string | undefined;
  const signedUserId = cookie[USER_ID_COOKIE]?.value as string | undefined;
  const userId = await verifyUserId(signedUserId);
  if (!accessToken || userId === null) return null;
  return { Authorization: accessToken, [NEW_API_USER]: String(userId) };
}

export async function resolveChatApiKey(
  cookie: Record<string, Cookie<unknown>>,
): Promise<string> {
  try {
    return getApiKey(cookie);
  } catch {}

  const headers = await authedUpstreamHeaders(cookie);
  if (headers) {
    const key = await resolveBestKey(headers);
    if (key) return `sk-${key}`;
  }

  if (serverEnv.guestApiKey) return serverEnv.guestApiKey;
  throw new Error(msg("ERRORS.UNAUTHORIZED"));
}
