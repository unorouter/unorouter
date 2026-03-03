export const ADMIN_HEADERS = {
  Authorization: process.env.SYSTEM_ACCESS_TOKEN,
  "New-Api-User": "1",
};

/**
 * Extracts the New-Api-User header value from the request's uno_user_id cookie.
 * Also returns the raw cookie header for session forwarding.
 */
export function getUserHeaders(request: Request): Record<string, string> {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const headers: Record<string, string> = {};

  if (cookieHeader) {
    headers.cookie = cookieHeader;
  }

  const match = cookieHeader.match(/(?:^|;\s*)uno_user_id=([^;]*)/);
  if (match) {
    let userId = decodeURIComponent(match[1]);
    try {
      userId = String(JSON.parse(userId));
    } catch {
      // use as-is
    }
    if (userId) {
      headers["New-Api-User"] = userId;
    }
  }

  return headers;
}
