import { USER_ID_COOKIE } from "@/lib/config/constants";
import { parseCookie } from "cookie";

export function deriveUpstream({ request }: { request: Request }) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const headers: Record<string, string> = {};
  if (cookieHeader) {
    headers.cookie = cookieHeader;
    const userId = parseCookie(cookieHeader)[USER_ID_COOKIE];
    if (userId) headers["New-Api-User"] = userId;
  }
  return { upstream: headers };
}
