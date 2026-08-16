import {
  ACCESS_TOKEN_COOKIE,
  GUEST_USER_ID,
  msg,
  NEW_API_USER,
  USER_ID_COOKIE,
} from "@/lib/config/constants";
import { verifyUserId } from "@/lib/utils/server";
import { addToken, getTokenKey, searchTokens } from "@/openapi";
import { getApiKey } from "@/server/constants";
import { serverEnv } from "@/server/env";
import { isModelFree } from "@/server/models/pricing/pricing.service";
import type { Cookie } from "elysia";

export async function assertGuestFreeModel(userId: number, model?: string) {
  if (userId !== GUEST_USER_ID || !model) return;
  if (!(await isModelFree(model))) throw new Error(msg("ERRORS.UNAUTHORIZED"));
}

export async function resolveBestKey(
  headers: Record<string, string>,
): Promise<string | null> {
  const res = await searchTokens({ p: 1, page_size: 100 }, { headers });
  const tokens = res.data?.data?.items;
  if (!tokens?.length) return createAutoToken(headers);

  // Group-pinned tokens (billing group locked to one channel-group) are NEVER
  // eligible: if that group's channel churns away, every request through the
  // token dies with get_channel_failed while writing no usage rows. An account
  // with only pinned tokens gets null here, which falls through to the guest
  // key instead of a silently broken pin.
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
    enabled.find((tok) => unpinned(tok.group));

  if (!best) return createAutoToken(headers);

  const keyRes = await getTokenKey(String(best.id), { headers });
  return keyRes.data?.data?.key ?? null;
}

// Account has no usable unpinned token: mint a fresh auto-group one instead of
// falling back to a pinned token or the guest key.
async function createAutoToken(
  headers: Record<string, string>,
): Promise<string | null> {
  const created = await addToken(
    {
      name: "UnoRouter Chat",
      group: "auto",
      expired_time: -1,
      remain_quota: 0,
      unlimited_quota: true,
      model_limits: "",
      model_limits_enabled: false,
      cross_group_retry: false,
      allow_ips: null,
      group_mapping: "",
      auto_groups: null,
    },
    { headers },
  );
  if (!created.data?.success) return null;
  const res = await searchTokens({ p: 1, page_size: 100 }, { headers });
  const fresh = res.data?.data?.items?.find(
    (tok) => tok && tok.status === 1 && tok.name === "UnoRouter Chat",
  );
  if (!fresh) return null;
  const keyRes = await getTokenKey(String(fresh.id), { headers });
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
