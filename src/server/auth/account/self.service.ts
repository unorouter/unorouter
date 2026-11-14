import { clearSessionCookies, setSessionCookies } from "@/lib/api/auth";
import { ACCESS_TOKEN_COOKIE, NEW_API_USER } from "@/lib/config/constants";
import { isUpstreamError } from "@/lib/custom-fetch";
import { unwrap } from "@/lib/utils/base";
import { getSelf, type UserSelfData } from "@/openapi";
import { deriveUpstream } from "@/server/constants";
import type { Context } from "elysia";

// Passing `cookie` opts into session repair (token writeback + clear on 401).
export async function resolveSelf(
  request: Request,
  cookie?: Context["cookie"],
): Promise<{ user: UserSelfData | null; expired: boolean }> {
  const { upstream } = await deriveUpstream({ request });
  if (!upstream.headers[NEW_API_USER]) {
    // A token without a verifiable user-id is a dead session, not a guest:
    // left alone it sat in the browser and failed every server prefetch.
    const stale = Boolean(cookie?.[ACCESS_TOKEN_COOKIE]?.value);
    if (cookie && stale) clearSessionCookies(cookie);
    return { user: null, expired: stale };
  }
  try {
    const user = unwrap(await getSelf(upstream)).data;
    // Upstream re-issues past half-life; dropping this writeback expires active sessions.
    if (cookie && user.access_token && user.id) {
      await setSessionCookies(
        cookie,
        user.id,
        user.access_token,
        user.access_expires_at,
      );
    }
    return { user, expired: false };
  } catch (err) {
    const expired = isUpstreamError(err) && err.status === 401;
    if (cookie && expired) clearSessionCookies(cookie);
    return { user: null, expired };
  }
}
