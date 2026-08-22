import { clearSessionCookies, setSessionCookies } from "@/lib/api/auth";
import { NEW_API_USER } from "@/lib/config/constants";
import { isUpstreamError } from "@/lib/custom-fetch";
import { unwrap } from "@/lib/utils/base";
import { getSelf, type UserSelfData } from "@/openapi";
import { deriveUpstream } from "@/server/constants";
import type { Context } from "elysia";

// Passing `cookie` opts into session repair: a 401 despite a verified cookie
// means the cookie outlived the upstream token, and clearing it is what stops
// the client sitting half-logged-in where every action 401s.
export async function resolveSelf(
  request: Request,
  cookie?: Context["cookie"],
): Promise<{ user: UserSelfData | null; expired: boolean }> {
  const { upstream } = await deriveUpstream({ request });
  if (!upstream.headers[NEW_API_USER]) return { user: null, expired: false };
  try {
    const user = unwrap(await getSelf(upstream)).data;
    // Upstream re-issues once the token is past half its life, so writing it
    // back here is what keeps an active session from ever reaching the hard
    // expiry. Absent on a fresh token and for API-key callers.
    const renewed = user as UserSelfData & {
      access_token?: string;
      access_expires_at?: number;
    };
    if (cookie && renewed.access_token && user.id) {
      await setSessionCookies(
        cookie,
        user.id,
        renewed.access_token,
        renewed.access_expires_at,
      );
    }
    return { user, expired: false };
  } catch (err) {
    const expired = isUpstreamError(err) && err.status === 401;
    if (cookie && expired) clearSessionCookies(cookie);
    return { user: null, expired };
  }
}
