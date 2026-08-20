import { clearSessionCookies } from "@/lib/api/auth";
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
    return { user: unwrap(await getSelf(upstream)).data, expired: false };
  } catch (err) {
    const expired = isUpstreamError(err) && err.status === 401;
    if (cookie && expired) clearSessionCookies(cookie);
    return { user: null, expired };
  }
}
